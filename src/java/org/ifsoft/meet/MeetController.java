package org.ifsoft.meet;

import java.util.*;
import java.util.concurrent.*;
import java.io.*;
import java.security.*;

import org.jivesoftware.openfire.XMPPServer;
import org.jivesoftware.openfire.SessionManager;
import org.jivesoftware.util.*;
import org.jivesoftware.openfire.group.*;
import org.jivesoftware.openfire.user.*;
import org.jivesoftware.openfire.session.*;

import org.xmpp.packet.*;
import org.jivesoftware.openfire.plugin.rawpropertyeditor.RawPropertyEditor;
import org.jivesoftware.openfire.plugin.rest.RESTServicePlugin;
import org.jivesoftware.openfire.plugin.rest.dao.PropertyDAO;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import net.sf.json.*;
import org.xmpp.packet.*;
import org.dom4j.Element;
import com.google.common.io.BaseEncoding;
import com.google.gson.Gson;
import org.apache.http.HttpResponse;
import nl.martijndwars.webpush.*;

import org.bouncycastle.jce.ECNamedCurveTable;
import org.bouncycastle.jce.interfaces.ECPrivateKey;
import org.bouncycastle.jce.interfaces.ECPublicKey;
import org.bouncycastle.jce.spec.ECNamedCurveParameterSpec;

/**
 * The Class MeetController.
 */
public class MeetController {

    private static final Logger Log = LoggerFactory.getLogger(MeetController.class);
    public static final MeetController INSTANCE = new MeetController();

    private final ConcurrentHashMap<String, String> callIds = new ConcurrentHashMap<String, String>();
    private final ConcurrentHashMap<String, String> droppedCalls = new ConcurrentHashMap<String, String>();
    private final ConcurrentHashMap<String, String> makeCalls = new ConcurrentHashMap<String, String>();
    private final ConcurrentHashMap<String, JSONObject> callList = new ConcurrentHashMap<String, JSONObject>();
    private final ConcurrentHashMap<String, ExpectedCall> expectedCalls = new ConcurrentHashMap<String, ExpectedCall>();

    /**
     * Gets the instance.
     *
     * @return the instance
     */
    public static MeetController getInstance() {
        return INSTANCE;
    }

    //-------------------------------------------------------
    //
    // FreeSWITCH
    //
    //-------------------------------------------------------

    /**
     * perform action on active call
     *
     */
    public boolean performAction(String action, String callId, String destination)
    {
        Log.debug("performAction " + action + " " + callId + " " + destination + " " + callList.get(callId));

        boolean processed = false;

        if ("clear".equals(action) && RESTServicePlugin.getInstance().sendAsyncFWCommand("uuid_kill " + callId) != null)
        {
            processed = true;
        }
        else

        if ("hold".equals(action) && RESTServicePlugin.getInstance().sendAsyncFWCommand("uuid_hold toggle " + callId) != null)
        {
            processed = true;
        }
        else

        if ("transfer".equals(action) && RESTServicePlugin.getInstance().sendAsyncFWCommand("uuid_transfer " + callId + " -bleg " + destination) != null)
        {
            processed = true;
        }

        return processed;
    }

    /**
     * make a phone call
     *
     */
    public String makeCall(String user, String destination)
    {
        Log.debug("makeCall " + user + " " + destination);

        String callId = "makecall-" + System.currentTimeMillis() + "-" + user + "-" + destination;
        String sipDomain = JiveGlobals.getProperty("freeswitch.sip.hostname", RESTServicePlugin.getInstance().getIpAddress());
        String command = "originate {presence_id=" + user + "@" + sipDomain + ",origination_caller_id_name='" + destination + "',origination_caller_id_number='" + destination + "',sip_from_user='" + user + "',origination_uuid=" + callId + "}[sip_invite_params=intercom=true,sip_h_Call-Info=<sip:" + sipDomain + ">;answer-after=0,sip_auto_answer=true]user/" + user + " " + destination;

        makeCalls.put(callId, destination);

        if (RESTServicePlugin.getInstance().sendAsyncFWCommand(command) != null)
        {
            int counter = 0;

            while (makeCalls.containsKey(callId) && counter < 30) // timeout after 30 secs
            {
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException ie) { }

                counter++;
            }

            if (counter < 30) {
                return callId;

            } else {
                Log.warn("makeCall timeout \n" + command);
            }
        }

        makeCalls.remove(callId);
        return "";
    }

    /**
     * flash a phone number
     *
     */
    public boolean flashPhone(String bridge, String destination)
    {
        Log.debug("flashPhone " + bridge + " " + destination);

        String sipGateway = JiveGlobals.getProperty("freeswitch.sip.gateway", RESTServicePlugin.getInstance().getIpAddress());
        String sipGatewayHost = JiveGlobals.getProperty("freeswitch.sip.gateway.host", sipGateway);

        String callId = "flashphone-" + System.currentTimeMillis() + "-" + destination;
        String command = "originate {origination_uuid=" + callId + "}sofia/gateway/" + sipGateway + "/" + destination + "@" + sipGatewayHost + " &park()";

        droppedCalls.put(callId, bridge);

        if (RESTServicePlugin.getInstance().sendAsyncFWCommand(command) != null)
        {
            int counter = 0;

            while (droppedCalls.containsKey(callId) && counter < 30) // timeout after a minute
            {
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException ie) { }

                counter++;
            }

            if (counter < 30) {
                return true;

            } else {
                Log.warn("flashPhone timeout \n" + command);
            }
        }

        droppedCalls.remove(callId);
        return false;
    }

    /**
     * add a user to an audiobridge conference
     *
     */
    public void addUserToAudiobridge(String extension, String audiobridge)
    {
        Log.debug("addUserToAudiobridge " + extension + " " + audiobridge);

        String sipDomain = JiveGlobals.getProperty("freeswitch.sip.hostname", RESTServicePlugin.getInstance().getIpAddress());
        String callbackName = JiveGlobals.getProperty("freeswitch.callback.name", extension);
        String callbackNumber = JiveGlobals.getProperty("freeswitch.callback.number", extension);
        String callId = audiobridge + "-" + System.currentTimeMillis();

        String command = "originate {origination_caller_id_name='" + callbackName + "',origination_caller_id_number='" + callbackNumber + "',sip_from_user='" + extension + "',origination_uuid=" + callId + "}[sip_invite_params=intercom=true,sip_h_Call-Info=<sip:" + sipDomain + ">;answer-after=0,sip_auto_answer=true]sofia/" + sipDomain + "/" + extension + " &conference(" + audiobridge + ")";

        if (RESTServicePlugin.getInstance().sendAsyncFWCommand(command) != null)
        {
            callIds.put(extension + audiobridge, callId);
        }
    }

    /**
     * remove a user from an audiobridge conference
     *
     */
    public void removeUserFromAudiobridge(String extension, String audiobridge)
    {
        Log.debug("removeUserFromAudiobridge " + extension + " " + audiobridge);

        String key = extension + audiobridge;

        if (callIds.containsKey(key))
        {
            RESTServicePlugin.getInstance().sendAsyncFWCommand("uuid_kill " + callIds.remove(key));
        }
    }

    /**
     * event from freeswitch
     *
     */
    public void conferenceEventLeave(Map<String, String> headers, String confName, int confSize)
    {

    }

    /**
     * event from freeswitch
     *
     */
    public void conferenceEventJoin(Map<String, String> headers, String confName, int confSize)
    {

    }

    /**
     * event from freeswitch
     *
     */
    public void sendSipEvent(String source, String destination, JSONObject callJson)
    {
        try {
            List<String> sources = PropertyDAO.getUsernameByProperty("caller_id_number", source);
            List<String> destinations = PropertyDAO.getUsernameByProperty("caller_id_number", destination);

            if (sources.size() > 0 || destinations.size() > 0)
            {
                String domain = XMPPServer.getInstance().getServerInfo().getXMPPDomain();

                Message message = new Message();
                message.setFrom(domain);
                message.addChildElement("ofswitch", "jabber:x:ofswitch").setText(callJson.toString());

                if (sources.size() > 0) XMPPServer.getInstance().getSessionManager().userBroadcast(sources.get(0), message);
                if (destinations.size() > 0) XMPPServer.getInstance().getSessionManager().userBroadcast(destinations.get(0), message);
            }

        } catch (Exception e) {
            Log.error("sendSipEvent", e);
        }
    }

    /**
     * event from freeswitch
     *
     */
    public void callStateEvent(Map<String, String> headers)
    {
        final String callState = headers.get("Channel-Call-State");
        final String origCallState = headers.get("Original-Channel-Call-State");
        final String callDirection = headers.get("Call-Direction");
        final String source = headers.get("Caller-Caller-ID-Number");
        final String destination = headers.get("Caller-Destination-Number");
        final String otherCallId = headers.get("Other-Leg-Unique-ID");
        final String callId = headers.get("Caller-Unique-ID");

        Log.info("callStateEvent " + callState + " " + origCallState + " " + destination + " " + source + " " + callId + " " + otherCallId + " " + callDirection);

        if ("ACTIVE".equals(callState) || "HANGUP".equals(callState) || "RINGING".equals(callState) || "HELD".equals(callState))
        {
            JSONObject callJson = new JSONObject();
            callJson.put("state", callState);
            callJson.put("prev_state", origCallState);
            callJson.put("direction", callDirection);
            callJson.put("source", source);
            callJson.put("destination", destination);
            callJson.put("other_call_id", otherCallId);
            callJson.put("call_id", callId);

            if ("ACTIVE".equals(callState))
            {
                makeCalls.remove(callId);

                callList.put(callId, callJson);
                sendSipEvent(source, destination, callJson);
            }
            else

            if ("HANGUP".equals(callState))
            {
                callList.remove(callId);
                sendSipEvent(source, destination, callJson);
            }

            else

            if (("RINGING".equals(callState) && "outbound".equals(callDirection)) || "HELD".equals(callState))
            {
                sendSipEvent(source, destination, callJson);
            }
        }

        // flash-call

        if ("RINGING".equals(callState) && "inbound".equals(callDirection))
        {
            if (expectedCalls.containsKey(source))
            {
                ExpectedCall expectedCall = expectedCalls.remove(source);

                //String command = "uuid_transfer " + callId + " " + destination + ";conf=" + expectedCall.audiobridge;
                String command = "uuid_broadcast " + callId + " conference::" + expectedCall.audiobridge;

                RESTServicePlugin.getInstance().sendAsyncFWCommand(command);
            }
        }
        else

        if ("DOWN".equals(origCallState) && "EARLY".equals(callState) && "outbound".equals(callDirection))
        {
            // call ringing, kill now

            String bridge = droppedCalls.remove(callId);

            if (bridge != null)
            {
                new Timer().schedule(new TimerTask()
                {
                    @Override public void run()
                    {
                        RESTServicePlugin.getInstance().sendAsyncFWCommand("uuid_kill " + callId);
                    }

                }, 1000);

                setupExpectedCall(bridge, source);
            }
        }
        else

        if ("EARLY".equals(origCallState) && "ACTIVE".equals(callState) && "outbound".equals(callDirection))
        {
            // call answered, should not happen for flashphone. kill anyway

            String bridge = droppedCalls.remove(callId);

            if (bridge != null)
            {
                new Timer().schedule(new TimerTask()
                {
                    @Override public void run()
                    {
                        RESTServicePlugin.getInstance().sendAsyncFWCommand("uuid_kill " + callId);
                    }

                }, 1000);

                setupExpectedCall(bridge, source);
            }
        }

        else

        if ("ACTIVE".equals(origCallState) && "HANGUP".equals(callState) && "outbound".equals(callDirection))
        {
            // call cleared, clean up
            String bridge = droppedCalls.remove(callId);

            if (bridge != null)
            {
                setupExpectedCall(bridge, source);
            }
        }
        else

        if ("DOWN".equals(origCallState) && "HANGUP".equals(callState) && "outbound".equals(callDirection))
        {
            // call failed, clean up
            String bridge = droppedCalls.remove(callId);

            if (bridge != null)
            {
                setupExpectedCall(bridge, source);
            }
        }

        else

        if ("EARLY".equals(origCallState) && "HANGUP".equals(callState) && "outbound".equals(callDirection))
        {
            // call missed, should not happen, cleanup
            String bridge = droppedCalls.remove(callId);

            if (bridge != null)
            {
                setupExpectedCall(bridge, source);
            }
        }
    }

    /**
     * queue expected callback
     *
     */
    public void setupExpectedCall(String bridge, String caller)
    {
        if (expectedCalls.containsKey(caller) == false)
        {
            expectedCalls.put(caller, new ExpectedCall());
        }

        ExpectedCall expectedCall = expectedCalls.get(caller);
        expectedCall.registered = System.currentTimeMillis();
        expectedCall.expired = expectedCall.registered + (15 * 3600000);
        expectedCall.caller = caller;
        expectedCall.audiobridge = bridge;
    }

    private class ExpectedCall
    {
        public long registered;
        public long expired;
        public String caller;
        public String audiobridge;
    }

    //-------------------------------------------------------
    //
    //  Web Push
    //
    //-------------------------------------------------------

    /**
     * push a payload to all subscribed web push resources of a group
     *
     */
    public boolean groupWebPush(String groupName, String payload)
    {
        boolean ok = false;

        String publicKey = JiveGlobals.getProperty("vapid.public.key", null);
        String privateKey = JiveGlobals.getProperty("vapid.private.key", null);
        String domain = XMPPServer.getInstance().getServerInfo().getXMPPDomain();

        try {
            Group group = GroupManager.getInstance().getGroup(groupName);

            if (group != null && publicKey != null && privateKey != null)
            {
                PushService pushService = new PushService()
                    .setPublicKey(publicKey)
                    .setPrivateKey(privateKey)
                    .setSubject("mailto:admin@" + domain);

                Log.debug("groupWebPush keys \n"  + publicKey + "\n" + privateKey);

                for (String key : group.getProperties().keySet())
                {
                    if (key.startsWith("webpush.subscribe."))
                    {
                        try {
                            Subscription subscription = new Gson().fromJson(group.getProperties().get(key), Subscription.class);
                            Notification notification = new Notification(subscription, payload);
                            HttpResponse response = pushService.send(notification);
                            int statusCode = response.getStatusLine().getStatusCode();

                            ok =  ok && (200 == statusCode) || (201 == statusCode);

                            Log.info("groupWebPush delivered "  + statusCode + "\n" + response);

                        } catch (Exception e) {
                            Log.error("groupWebPush failed "  + "\n" + payload, e);
                        }
                    }
                }

            }
        } catch (Exception e1) {
            Log.error("groupWebPush failed "  + "\n" + payload, e1);
        }

        return ok;
    }

    /**
     * push a payload to all subscribed web push resources of a user
     *
     */
    public boolean postWebPush(String username, String payload)
    {
        Log.debug("postWebPush "  + username + "\n" + payload);

        User user = RawPropertyEditor.getInstance().getAndCheckUser(username);
        if (user == null) return false;
        boolean ok = false;

        String publicKey = user.getProperties().get("vapid.public.key");
        String privateKey = user.getProperties().get("vapid.private.key");

        if (publicKey == null) publicKey = JiveGlobals.getProperty("vapid.public.key", null);
        if (privateKey == null) privateKey = JiveGlobals.getProperty("vapid.private.key", null);

        try {
            if (publicKey != null && privateKey != null)
            {
                PushService pushService = new PushService()
                    .setPublicKey(publicKey)
                    .setPrivateKey(privateKey)
                    .setSubject("mailto:admin@" + XMPPServer.getInstance().getServerInfo().getXMPPDomain());

                Log.debug("postWebPush keys \n"  + publicKey + "\n" + privateKey);

                for (String key : user.getProperties().keySet())
                {
                    if (key.startsWith("webpush.subscribe."))
                    {
                        try {
                            Subscription subscription = new Gson().fromJson(user.getProperties().get(key), Subscription.class);
                            Notification notification = new Notification(subscription, payload);
                            HttpResponse response = pushService.send(notification);
                            int statusCode = response.getStatusLine().getStatusCode();

                            ok = ok && (200 == statusCode) || (201 == statusCode);

                            Log.debug("postWebPush delivered "  + statusCode + "\n" + response);


                        } catch (Exception e) {
                            Log.error("postWebPush failed "  + username + "\n" + payload, e);
                        }
                    }
                }

            }
        } catch (Exception e1) {
            Log.error("postWebPush failed "  + username + "\n" + payload, e1);
        }

        return ok;
    }

    /**
     * store web push subscription as a user property
     *
     */
    public boolean putWebPushSubscription(String username, String resource, String subscription)
    {
        Log.debug("putWebPushSubscription "  + username + " " + resource + "\n" + subscription);

        User user = RawPropertyEditor.getInstance().getAndCheckUser(username);
        if (user == null) return false;

        user.getProperties().put("webpush.subscribe." + resource, subscription);
        return true;
    }

    /**
     * generate a new public/private key pair for VAPID and store in system properties
     * and user properties
     */
    public String getWebPushPublicKey(String username)
    {
        Log.debug("getWebPushPublicKey " + username);

        String ofPublicKey = null;
        String ofPrivateKey = null;

        User user = RawPropertyEditor.getInstance().getAndCheckUser(username);
        if (user == null) return null;

        ofPublicKey = user.getProperties().get("vapid.public.key");
        ofPrivateKey = user.getProperties().get("vapid.private.key");

        if (ofPublicKey == null || ofPrivateKey == null)
        {
            try {
                KeyPair keyPair = generateKeyPair();

                byte[] publicKey = Utils.savePublicKey((ECPublicKey) keyPair.getPublic());
                byte[] privateKey = Utils.savePrivateKey((ECPrivateKey) keyPair.getPrivate());

                ofPublicKey = BaseEncoding.base64Url().encode(publicKey);
                ofPrivateKey = BaseEncoding.base64Url().encode(privateKey);

                user.getProperties().put("vapid.public.key", ofPublicKey);
                JiveGlobals.setProperty("vapid.public.key", ofPublicKey);

                user.getProperties().put("vapid.private.key", ofPrivateKey);
                JiveGlobals.setProperty("vapid.private.key", ofPrivateKey);

            } catch (Exception e) {
                Log.error("getWebPushPublicKey", e);
            }

        } else {
            user.getProperties().put("vapid.public.key", ofPublicKey);
            user.getProperties().put("vapid.private.key", ofPrivateKey);
        }

        return ofPublicKey;
    }

    /**
     * Generate an EC keypair on the prime256v1 curve.
     *
     * @return
     * @throws InvalidAlgorithmParameterException
     * @throws NoSuchProviderException
     * @throws NoSuchAlgorithmException
     */
    private KeyPair generateKeyPair() throws InvalidAlgorithmParameterException, NoSuchProviderException, NoSuchAlgorithmException {
        ECNamedCurveParameterSpec parameterSpec = ECNamedCurveTable.getParameterSpec("prime256v1");

        KeyPairGenerator keyPairGenerator = KeyPairGenerator.getInstance("ECDH", "BC");
        keyPairGenerator.initialize(parameterSpec);

        return keyPairGenerator.generateKeyPair();
    }

    //-------------------------------------------------------
    //
    //  Jitsi Meet
    //
    //-------------------------------------------------------

    public boolean inviteToJvb(String username, String jid)
    {
        if (SessionManager.getInstance().getSessions(username).size() > 0)
        {
            String room = username + "-" + System.currentTimeMillis();
            String domain = XMPPServer.getInstance().getServerInfo().getXMPPDomain();

            try {
                JID jid1 = new JID(username + "@" + domain);
                JID jid2 = new JID(jid);

                String confJid = room + "@conference." + domain;

                Message message1 = new Message();
                message1.setFrom(jid1);
                message1.setTo(jid2);
                Element x1 = message1.addChildElement("x", "jabber:x:conference").addAttribute("jid", confJid);
                x1.addElement("invite").addAttribute("from", jid1.toString());
                XMPPServer.getInstance().getRoutingTable().routePacket(jid2, message1, true);

                Message message2 = new Message();
                message2.setFrom(jid2);
                message2.setTo(jid1);
                Element x2 = message2.addChildElement("x", "jabber:x:conference").addAttribute("jid", confJid).addAttribute("autoaccept", "true");
                x2.addElement("invite").addAttribute("from", jid2.toString());
                XMPPServer.getInstance().getRoutingTable().routePacket(jid1, message2, true);

                return true;

            } catch (Exception e) {
                Log.error("inviteToJvb", e);
            }
        }
        return false;
    }
}