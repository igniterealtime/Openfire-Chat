package org.traderlynk.blast;

import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.Date;
import java.util.concurrent.*;
import java.util.concurrent.*;
import javax.ws.rs.core.Response;

import org.jivesoftware.openfire.XMPPServer;
import org.jivesoftware.openfire.SessionManager;
import org.jivesoftware.util.*;
import org.jivesoftware.openfire.plugin.rawpropertyeditor.RawPropertyEditor;
import org.jivesoftware.openfire.spi.XMPPServerInfoImpl;
import org.jivesoftware.openfire.plugin.rest.entity.*;
import org.jivesoftware.openfire.plugin.rest.exceptions.ServiceException;
import org.jivesoftware.openfire.plugin.rest.exceptions.ExceptionType;
import org.jivesoftware.openfire.user.*;
import org.jivesoftware.openfire.group.*;
import org.jivesoftware.openfire.roster.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.dom4j.Element;
import org.xmpp.packet.*;

import com.google.gson.Gson;
import org.apache.http.HttpResponse;
import nl.martijndwars.webpush.*;

import net.sf.json.*;
import org.ifsoft.meet.MeetController;
import org.ifsoft.sms.Servlet;

public class MessageBlastController {

    private static final Logger Log = LoggerFactory.getLogger(MessageBlastController.class);
    private static final UserManager userManager = XMPPServer.getInstance().getUserManager().getInstance();
    public static final MessageBlastController INSTANCE = new MessageBlastController();

    public final Map<String, MessageBlastSentEntity> blastSents = new ConcurrentHashMap<String, MessageBlastSentEntity>();
    public final Map<String, BlastChat> blastChats = new ConcurrentHashMap<String, BlastChat>();

    public static MessageBlastController getInstance() {
        return INSTANCE;
    }

    public void RetryIncompleteBlasts() {
        Log.debug("MessageBlastController Retrying Incomplete Blasts");
        getIncompleteMessageBlasts();
    }

    public List<MessageBlastSentEntity> getIncompleteMessageBlasts() {
        Collection userCollection = XMPPServer.getInstance().getUserManager().getUsers();
        List<User> usersList;
        List<MessageBlastSentEntity> incompleteBlasts = new ArrayList<MessageBlastSentEntity>();

        if (userCollection instanceof List) {
            usersList = (List) userCollection;
        } else {
            usersList = new ArrayList(userCollection);
        }

        if (usersList.size() > 0) {
            for (int i = 0; i < usersList.size(); i++) {
                User user = usersList.get(i);
                for (String key : user.getProperties().keySet()) {
                    if (key.contains("ofchat.blast.message")) {
                        try {
                            JSONObject bm = new JSONObject(user.getProperties().get(key));
                            if (bm.getBoolean("completed") == false) {
                                MessageBlastSentEntity mbse = new MessageBlastSentEntity();
                                mbse.setId(bm.getString("id"));
                                mbse.setTitle(bm.getString("title"));
                                mbse.setRecipientsCount(bm.getInt("recipientsCount"));
                                mbse.setSentCount(bm.getInt("sentCount"));
                                mbse.setRecieveCount(bm.getInt("recieveCount"));
                                mbse.setReadCount(bm.getInt("readCount"));
                                mbse.setRespondCount(bm.getInt("respondCount"));
                                mbse.setCompleted(bm.getBoolean("completed"));
                                mbse.setSentDate(bm.getString("sentDate"));
                                mbse.setOpenfireUser(bm.getString("openfireUser"));
                                MessageBlastEntity mbe = new MessageBlastEntity(bm.getJSONObject("mbe"));
                                mbse.setMessageBlastEntity(mbe);
                                incompleteBlasts.add(mbse);
                                routeMessageBlast(user.getUsername(), mbe, bm.getString("id"));
                            }
                        } catch (Exception e) {
                            Log.error("MessageBlastController Failed to parse an incomplete message blast:",
                                    e.getMessage());
                        }
                    }
                }
            }
        }
        return incompleteBlasts;
    }

    public JSONObject routeMessageBlast(String fromUser, MessageBlastEntity mbe, String id) {
        Log.debug("routeMessageBlast\n" + mbe.toJSONString());

        JSONObject response = new JSONObject();
        /*
            {
              "ackRequired": true,
              "dateToSend": "string",
              "highImportance": true,
              "message": "halt and catch fire",
              "messagehtml": "<b>halt</b> and catch <font color='red'>fire</font>",
              "recipients": [
                "mark.briant-evans@tlk.lan"
              ],
              "replyTo": "twopartycall@tlk.lan",
              "sender": "deleo@tlk.lan",
              "sendlater": "false",
              "dateToStart": "",
              "crontrigger": "",
              "cronstoptrigger": "",
              "dateToStop": "",
              "title": "Relaunch??"
            }
        */

        if(!mbe.hasNulls())
        {
            try {
                JSONObject mbejson = new JSONObject();
                mbejson.put("sendlater", mbe.getSendlater());
                mbejson.put("from", mbe.getSender());
                //sender is being lost
                mbejson.put("subject", mbe.getTitle());
                mbejson.put("replyTo", mbe.getReplyTo());

                if (mbe.getHighImportance()) {
                    mbejson.put("importance", "Urgent");
                } else {
                    mbejson.put("importance", "Normal");
                }

                mbejson.put("body", mbe.getMessage());
                mbejson.put("bodyhtml", mbe.getMessagehtml());
                mbejson.put("to", "");
                mbejson.put("action", "blast_message");

                //Set a user prop that is for this blast title, count,total,completed

                MessageBlastSentEntity mbse = new MessageBlastSentEntity();

                if (id != null) {
                    mbse.setId(id);
                } else {
                    mbse.setId("blast-" + System.currentTimeMillis());
                }

                mbse.setTitle(mbe.getTitle());
                DateFormat dateFormat = new SimpleDateFormat("yyyy/MM/dd HH:mm:ss");
                Date date = new Date();
                mbse.setSentDate(dateFormat.format(date));
                mbse.setMessageBlastEntity(mbe);
                mbse.setOpenfireUser(fromUser);

                // keep Message Blast Sent Entity for tracking

                blastSents.put(mbse.getId(), mbse);
                mbejson.put("id", mbse.getId()); /* BOA we need id to track */

                int recipientsSize = mbe.getRecipients().size();
                int recipientsCount = 0;

                // get count of recipients less groups

                for (int i = 1; i < recipientsSize; i++)
                {
                    if (mbe.getRecipients().get(i).contains("@")) recipientsCount++;
                }

                String hostname = XMPPServer.getInstance().getServerInfo().getHostname();

                // with trusted app, we send whole batch in order to perform
                // a bulk presence query in a single request

                mbse.setRecipientsCount(recipientsSize);

                for (int i = 0; i < recipientsSize; i++)
                {
                    int c = i;
                    mbse.setSentCount(c + 1);

                    if (c % 10 == 0) {
                        // TODO fix check pointing
                        //checkpointState(fromUser, mbse);
                        mbse.setMessageBlastEntity(mbe);
                    }

                    mbejson.remove("to");
                    String recipient = mbe.getRecipients().get(0);
                    mbejson.put("to", recipient);
                    mbe.getRecipients().remove(recipient);

                    try {
                        dispatchMessage(fromUser, mbejson);

                    } catch (Exception e) {
                        Log.error("MessageBlastController IQ Error MessageID:" + mbse.getId(), e.getMessage());
                        response.put("Type", "Error");
                        response.put("Message", "Server Error! " + e);
                        return response;
                    }
                }

                mbse.setMessageBlastEntity(mbe);
                checkpointState(fromUser, mbse);

            } catch (Exception e) {
                Log.error("MessageBlastController Failed to create json ", e);
                response.put("Type", "Error");
                response.put("Message", e.toString());
                return response;

            }
            response.put("Type", "Success");
            return response;
        }else{
            response.put("Type","Error");
            response.put("Message","Some or all required values no present in request");
            return response;
        }
    }

    private void dispatchMessage(String fromUser, JSONObject requestJSON) throws GroupNotFoundException
    {
        String from = requestJSON.getString("from");
        String to = requestJSON.getString("to");
        String subject = requestJSON.getString("subject");
        String replyTo = requestJSON.getString("replyTo");
        String importance = requestJSON.getString("importance");
        String body = requestJSON.getString("body");
        String bodyhtml = requestJSON.getString("bodyhtml");
        String id = requestJSON.getString("id");
        String sendlater = requestJSON.getString("sendlater");

        Log.debug("dispatchMessage " + id + " " + from + " " + to + " " + subject + " " + importance + " " + replyTo + "\n" + body);

        if (to.indexOf("@") > -1)
        {
            sendMessage(fromUser, from, to, subject, replyTo, body, id);

        } else if (to.startsWith("+")) { // SMS number

            if (JiveGlobals.getBooleanProperty("ofchat.sms.enabled", false))
            {
                String smsFromUser = (replyTo == null || "".equals(replyTo)) ? from : replyTo;
                User fromUsr = null;

                try {fromUsr = userManager.getUser(smsFromUser);} catch (Exception e1) {}

                if (fromUsr != null)
                {
                    String smsFrom = fromUsr.getProperties().get("sms_out_number");

                    if (smsFrom != null)
                    {
                        Servlet.smsOutgoing(to.substring(1), smsFrom, body);    // remove +

                        BlastChat blastChat = new BlastChat(fromUser, id, from, to, replyTo, subject, body);

                        blastChat.setMessageRead("Message Sent");
                        blastChat.setRecipientsCount();

                        String key = fromUser + id + to;
                        blastChats.put(key, blastChat);

                        incrementRecieveCount(id, 1);
                        checkpointState(id);
                    }
                }
            }

        } else {
            Group group = GroupManager.getInstance().getGroup(to);

            if (group != null)
            {
                for (JID memberJID : group.getMembers())
                {
                    sendMessage(fromUser, from, memberJID.toString(), subject, replyTo, body, id);
                }

                for (JID memberJID : group.getAdmins())
                {
                    sendMessage(fromUser, from, memberJID.toString(), subject, replyTo, body, id);
                }

                // message blast to bloggers group using webpush if selected

                String groupName = JiveGlobals.getProperty("solo.blog.name", "solo");

                if (groupName.equals(group.getName()))
                {
                    MeetController.getInstance().groupWebPush(groupName, body);
                }
            }
        }
    }

    private void sendMessage(String fromUser, String from, String to, String subject, String replyTo, String body, String id)
    {
        Message message = new Message();
        message.setTo(to);
        message.setFrom((replyTo == null || "".equals(replyTo)) ? from : replyTo);
        message.setType(Message.Type.chat);
        message.setSubject(subject);
        message.setBody(body);

        XMPPServer.getInstance().getMessageRouter().route(message);

        BlastChat blastChat = new BlastChat(fromUser, id, from, to, replyTo, subject, body);
        String key = fromUser + id + to;
        blastChats.put(key, blastChat);

        incrementRecieveCount(id, 1);
        checkpointState(id);

        if (SessionManager.getInstance().getSessions(message.getTo().getNode()).size() > 0)
        {
            blastChat.setMessageRead("Message Sent");
            blastChat.setRecipientsCount();
        }
    }

    private void incrementRecieveCount(String id, int increment)
    {
        MessageBlastSentEntity job = blastSents.get(id);

        if (job != null) {
            Log.debug("incrementRecieveCount job " + job.getId() + " " + job.getTitle() + " " + job.getSentCount() + " "
                    + job.getRecieveCount() + " " + job.getReadCount() + " " + job.getRespondCount());

            int count = job.getRecieveCount();
            count = count + increment;
            job.setRecieveCount(count);

            writeState(job.getOpenfireUser(), job);
        }
    }
    private void checkpointState(String id)
    {
        MessageBlastSentEntity job = blastSents.get(id);

        if (job != null) {
            Log.debug("incrementSentCount job " + job.getId() + " " + job.getTitle() + " " + job.getSentCount() + " "
                    + job.getRecieveCount() + " " + job.getReadCount() + " " + job.getRespondCount());
            writeState(job.getOpenfireUser(), job);
        }
    }

    private void writeState(String from, MessageBlastSentEntity mbse)
    {
        try {
            RawPropertyEditor.self.addProperties(from, "ofchat.blast.message." + mbse.getId(), mbse.toJSONString());
        } catch (Exception e) {
            Log.error("MessageBlastController Failed to checkpoint State of blast message", e.getMessage());
        }
    }

    private void checkpointState(String from, MessageBlastSentEntity mbse)
    {
        try {
            // TODO Write MessageBlast to network cache/database and not user properties
            // for now empty list
            mbse.getMessageBlastEntity().setRecipients(new ArrayList<String>());

            RawPropertyEditor.self.addProperties(from, "ofchat.blast.message." + mbse.getId(), mbse.toJSONString());
        } catch (Exception e) {
            Log.error("MessageBlastController Failed to checkpoint State of blast message", e.getMessage());
        }
    }

    public MessageBlastSentEntities getSentBlasts(String from)
    {
        User user = RawPropertyEditor.self.getAndCheckUser(from);
        List<MessageBlastSentEntity> sentBlasts = new ArrayList<MessageBlastSentEntity>();

        for (String key : user.getProperties().keySet()) {

            if (key.contains("ofchat.blast.message")) {
                JSONObject bm = new JSONObject(user.getProperties().get(key));

                MessageBlastSentEntity mbse = blastSents.get(bm.getString("id"));

                if (mbse == null) // no more in memory
                {
                    mbse = new MessageBlastSentEntity();
                    mbse.setId(bm.getString("id"));
                    mbse.setTitle(bm.getString("title"));
                    mbse.setRecipientsCount(bm.getInt("recipientsCount"));
                    mbse.setSentCount(bm.getInt("sentCount"));
                    mbse.setRecieveCount(bm.getInt("recieveCount"));
                    mbse.setReadCount(bm.getInt("readCount"));
                    mbse.setRespondCount(bm.getInt("respondCount"));
                    mbse.setCompleted(bm.getBoolean("completed"));
                    mbse.setSentDate(bm.getString("sentDate"));
                    try {
                        String mbejson = bm.getString("mbe");
                        JSONObject mbejo = new JSONObject(mbejson);
                        MessageBlastEntity mbe = new MessageBlastEntity(mbejo);
                        mbse.setMessageBlastEntity(mbe);
                    }catch(Exception e ){
                        Log.debug("MessageBlastController Failed parsing sent blasts message", e );

                    }

                } else
                    user.getProperties().put(key, mbse.toJSONString());

                sentBlasts.add(mbse);
            }
        }
        Log.debug("MessageBlastController Retrieving " + sentBlasts.size() + " sent Blasts");
        return new MessageBlastSentEntities(sentBlasts);
    }

    public String getSenders(String from) {
        User user = RawPropertyEditor.self.getAndCheckUser(from);
        String domain = XMPPServer.getInstance().getServerInfo().getXMPPDomain();
        String senderlist = user.getProperties().get("ofchat.blast.sender");

        if (senderlist == null || senderlist.startsWith("{") == false)
        {
            JSONObject senders = new JSONObject();
            senders.put(from + "@" + domain, user.getName());
            senderlist = senders.toString();
            user.getProperties().put("ofchat.blast.sender", senderlist);
        }
        String blastHelp = JiveGlobals.getProperty("ofchat.blast.help", "");

        JSONObject senders = new JSONObject(senderlist);
        JSONObject sendersJSON = new JSONObject();
        sendersJSON.put("help_url", blastHelp);
        sendersJSON.put("senders", senders);

        Log.debug("MessageBlastController Retrieving \n" + sendersJSON.toString());
        return sendersJSON.toString();
    }

    public JSONObject CreateSenderList(String mbs , String from){
        JSONObject returnobj = new JSONObject();

        try{
            Object validate = null;

            if (mbs.startsWith("["))
            {
                validate = new JSONArray(mbs);
            }
            else

            if (mbs.startsWith("{"))
            {
                validate = new JSONObject(mbs);
            }

            if (validate != null)
            {
                RawPropertyEditor.self.addProperties(from, "ofchat.blast.sender", mbs);
                returnobj.put("Type","Success");
            } else {
                returnobj.put("Type","Error");
                returnobj.put("Message","Invalid JSON object sent to service");
            }

        }catch(Exception e){
            Log.error("MessageBlastController Failed Creating Senders List", e);
            returnobj.put("Type","Error");
            returnobj.put("Message","Invalid JSON object sent to service");
        }
        return returnobj;
    }

    public BlastGroups searchContacts(String username, String from, String query, String limit) throws ServiceException
    {
        Log.debug("searchContacts " + query + " " + limit);

        JSONArray searchResult = new JSONArray();

        ArrayList<BlastGroup> groups = new ArrayList<BlastGroup>();
        ArrayList<BlastEntity> contactList = new ArrayList<BlastEntity>();

        for (int i = 0; i < searchResult.length(); i++)
        {
            JSONObject contact = searchResult.getJSONObject(i);

            if (contact.has("group"))
            {
                String groupName = contact.getString("group");
                String description = contact.getString("desc");

                contactList.add(new BlastEntity(groupName, description));
            }
            else

            if (contact.has("sipuri"))
            {
                String sip = contact.getString("sipuri").substring(4).toLowerCase();
                String displayName = contact.getString("name");

                contactList.add(new BlastEntity(sip, displayName));
            }
        }
        groups.add(new BlastGroup(contactList, "Search: " + query));
        return new BlastGroups(groups);
    }

    private List<String> getBlastSenders(String username)
    {
        List<String> senders = new ArrayList<String>();
        String domain = getDomain();

        senders.add(username + "@" + domain);

        User user = RawPropertyEditor.self.getAndCheckUser(username);
        String senderlist = user.getProperties().get("ofchat.blast.sender");

        if (senderlist.startsWith("{")) {
            JSONObject jaSenderlist = new JSONObject(senderlist);

            Iterator<?> keys = jaSenderlist.keys();

            while( keys.hasNext() )
            {
                String sender = (String)keys.next();
                senders.add(sender);
            }
        }
        return senders;
    }


    private String getDomain()
    {
        return XMPPServer.getInstance().getServerInfo().getXMPPDomain();
    }

    public BlastGroups fetchGroups(String username, String from) throws ServiceException
    {
        Log.debug("fetchGroups " + username + " " + from);

        if (getBlastSenders(username).contains(from) == false)
        {
            throw new ServiceException("User " + username + " not permitted to access " + from, "Permission", ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
        }

        try {
            ArrayList<BlastGroup> groups = new ArrayList<BlastGroup>();
            ArrayList<BlastEntity> adGroups = new ArrayList<BlastEntity>();

            User user = RawPropertyEditor.self.getAndCheckUser(username);

            if (user != null)
            {
                Collection<Group> ofGroups = GroupManager.getInstance().getGroups(user);
                adGroups = new ArrayList<BlastEntity>();

                for (Group group : ofGroups)
                {
                    String description = group.getDescription();
                    if (description == null || "".equals(description)) description = group.getName();
                    BlastEntity blastEntity = new BlastEntity(group.getName(), description);
                    adGroups.add(blastEntity);
                }

                groups.add(new BlastGroup(adGroups, "Groups"));

                ArrayList<BlastEntity> contacts = new ArrayList<BlastEntity>();
                org.jivesoftware.openfire.roster.Roster roster = XMPPServer.getInstance().getRosterManager().getRoster(username);

                for (RosterItem item : roster.getRosterItems())
                {
                    String description = item.getNickname();
                    if (description == null || "".equals(description)) description = item.getJid().getNode();
                    BlastEntity blastEntity = new BlastEntity(item.getJid().toString(), description);
                    contacts.add(blastEntity);
                }

                groups.add(new BlastGroup(contacts, "Contacts"));
            }
            return new BlastGroups(groups);

        } catch (Exception e) {
            Log.error("fetchGroups", e);
            throw new ServiceException(e.toString(), "Exception", ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
        }
    }

    public BlastGroups fetchConversations(String username, String from, String jobId, String filter, String type, String start, String count) throws ServiceException
    {
        Log.debug("fetchConversations " + username + " " + from + " " + jobId + " " + filter + " " + type + " " + start + " " + count);

        ArrayList<BlastGroup> groups = new ArrayList<BlastGroup>();
        ArrayList<BlastEntity> contactList = new ArrayList<BlastEntity>();

        int counter = 0;
        int startPoint = 1;
        int endPoint = 100; // default

        try {
            startPoint = Integer.parseInt(start);
            endPoint = startPoint + Integer.parseInt(count);

        } catch (Exception e) {}


        for (String key :  blastChats.keySet())
        {
            if (key.startsWith(username))
            {
                BlastChat blastChat = blastChats.get(key);

                if (blastChat.from.contains(from) && blastChat.id != null && jobId.equals(blastChat.id) && blastChat.isFiltered(filter, type))
                {
                    counter++;

                    if (counter < startPoint) continue;
                    if (counter > endPoint) break;

                    BlastEntity blastEntity = new BlastEntity(blastChat.to, blastChat.to);

                    blastEntity.setSubject(blastChat.subject);
                    blastEntity.setReplyTo(blastChat.replyTo);
                    blastEntity.setMessageOut(blastChat.body);
                    blastEntity.setMessageIn(blastChat.response);
                    blastEntity.setMessageError(blastChat.error);
                    blastEntity.setJobId(blastChat.id);

                    blastEntity.setSent(blastChat.body != null);
                    blastEntity.setRead(blastChat.conversationHref != null);
                    blastEntity.setResponded(blastChat.response != null);
                    blastEntity.setError(blastChat.error != null);
                    blastEntity.setEndpoint(blastChat.endpoint);

                    blastEntity.setFirstAttemptTimeStamp(blastChat.firstAttemptTimeStamp);
                    blastEntity.setLastAttemptTimeStamp(blastChat.lastAttemptTimeStamp);
                    blastEntity.setPresence(blastChat.presence);
                    blastEntity.setRetriesLeft(blastChat.retriesLeft);

                    contactList.add(blastEntity);
                }
            }
        }
        groups.add(new BlastGroup(contactList, "Conversations"));
        return new BlastGroups(groups);
    }

    public String deleteSentBlasts(String username, String from, String jobId) throws ServiceException
    {
        String response = null;

        Log.debug("deleteSentBlasts " + username + " " + from + " " + jobId);

        RawPropertyEditor.self.deleteProperties(username, "ofchat.blast.message." + jobId);

        ArrayList<String> keys = new ArrayList<String>();

        for (String key :  blastChats.keySet())
        {
            if (key.startsWith(username))
            {
                BlastChat blastChat = blastChats.get(key);

                if (blastChat.from.contains(from) && blastChat.id != null && jobId.equals(blastChat.id))
                {
                    keys.add(key);
                }
            }
        }

        for (String key: keys)
        {
            blastChats.remove(key);
        }
        return response;
    }
}

