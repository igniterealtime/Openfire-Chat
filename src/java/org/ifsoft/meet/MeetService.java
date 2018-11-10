package org.ifsoft.meet;

import java.io.*;
import java.net.*;
import java.util.*;
import java.text.SimpleDateFormat;

import javax.mail.*;
import javax.mail.internet.*;

import javax.servlet.http.HttpServletRequest;
import javax.annotation.PostConstruct;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.QueryParam;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Context;

import org.jivesoftware.openfire.XMPPServer;
import org.jivesoftware.openfire.roster.*;
import org.jivesoftware.openfire.user.*;
import org.jivesoftware.openfire.plugin.rest.controller.UserServiceController;
import org.jivesoftware.openfire.plugin.rest.entity.UserEntities;
import org.jivesoftware.openfire.plugin.rest.entity.UserEntity;

import org.jivesoftware.openfire.plugin.rest.exceptions.ServiceException;
import org.jivesoftware.openfire.plugin.rest.exceptions.ExceptionType;
import org.jivesoftware.util.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.jivesoftware.openfire.plugin.rest.BasicAuth;
import org.xmpp.packet.JID;
import net.sf.json.*;

@Path("restapi/v1/meet")
public class MeetService {

    private static final Logger Log = LoggerFactory.getLogger(MeetService.class);
    private MeetController meetController;

    @Context
    private HttpServletRequest httpRequest;

    @PostConstruct
    public void init()
    {
        meetController = MeetController.getInstance();
    }

    //-------------------------------------------------------
    //
    //  Web Push
    //
    //-------------------------------------------------------

    @GET
    @Path("/webpush")
    @Produces({MediaType.APPLICATION_XML, MediaType.APPLICATION_JSON})
    public UserEntities getPushSubscribers()  throws ServiceException
    {
        UserEntities userEntities = UserServiceController.getInstance().getUserEntitiesByProperty("webpush.subscribe.%", null);
        Map<String, UserEntity> users = new HashMap<String, UserEntity>();

        for (UserEntity user : userEntities.getUsers()) {
            user.setProperties(null);
            users.put(user.getUsername(), user);
        }

        return new UserEntities(users.values());
    }

    @GET
    @Path("/webpush/{username}")
    @Produces({MediaType.APPLICATION_XML, MediaType.APPLICATION_JSON})
    public PublicKey getWebPushPublicKey(@PathParam("username") String username) throws ServiceException {
        Log.debug("getWebPushPublicKey " + username);

        String publicKey = JiveGlobals.getProperty("vapid.public.key", null);

        if (publicKey == null)
        {
            publicKey = meetController.getWebPushPublicKey(username);
        }

        if (publicKey == null)
            throw new ServiceException("Exception", "public key not found", ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION,  Response.Status.NOT_FOUND);

        return new PublicKey(publicKey);
    }

    @PUT
    @Path("/webpush/{username}/{resource}")
    public Response putWebPushSubscription(@PathParam("username") String username, @PathParam("resource") String resource, String subscription) throws ServiceException {
        Log.debug("putWebPushSubscription " + username + " " + resource + "\n" + subscription);

        try {
            if (meetController.putWebPushSubscription(username, resource, subscription))
            {
                return Response.status(Response.Status.OK).build();
            }

        } catch (Exception e) {
            Log.error("putWebPushSubscription", e);
        }
        return Response.status(Response.Status.BAD_REQUEST).build();
    }

    @POST
    @Path("/webpush/{username}")
    public Response postWebPush(@PathParam("username") String username, String notification) throws ServiceException {
        Log.debug("postWebPush " + username + "\n" + notification);

        try {
            if (meetController.postWebPush(username, notification))
            {
                return Response.status(Response.Status.OK).build();
            }

        } catch (Exception e) {
            Log.error("postWebPush", e);
        }
        return Response.status(Response.Status.BAD_REQUEST).build();
    }

    //-------------------------------------------------------
    //
    //  FreeSWITCH
    //
    //-------------------------------------------------------

    @POST
    @Path("/flash/{bridge}/{destination}")
    public Response flashPhone(@PathParam("bridge") String bridge, @PathParam("destination") String destination) throws ServiceException
    {
        // use a missed call to notify a meeting participant to join meeting (flashing)
        // on incoming, check CLI and put into bridge if expected

        try {
            if (meetController.flashPhone(bridge, destination))
            {
                return Response.status(Response.Status.OK).build();
            }
        } catch (Exception e) {
            Log.error("flashPhone", e);
        }
        return Response.status(Response.Status.BAD_REQUEST).build();
    }

    @POST
    @Path("/phone/{username}/{destination}")
    public String makeCall(@PathParam("username") String username, @PathParam("destination") String destination) throws ServiceException
    {
        String callId = "";

        try {
            callId = meetController.makeCall(username, destination);

        } catch (Exception e) {
            Log.error("makeCall", e);
        }
        return "{\"id\": \"" + callId + "\"}";
    }

    @POST
    @Path("/action/{action}/{callId}")
    public Response performAction(@PathParam("action") String action, @PathParam("callId") String callId) throws ServiceException
    {
        try {
            if (meetController.performAction(action, callId))
            {
                return Response.status(Response.Status.OK).build();
            }

        } catch (Exception e) {
            Log.error("performAction", e);
        }
        return Response.status(Response.Status.BAD_REQUEST).build();
    }

    @POST
    @Path("/add/{username}/{audiobridge}")
    public Response addUserToAudiobridge(@PathParam("audiobridge") String audiobridge, @PathParam("username") String username) throws ServiceException
    {
        try {
            meetController.addUserToAudiobridge(username, audiobridge);
            return Response.status(Response.Status.OK).build();

        } catch (Exception e) {
            Log.error("addUserToAudiobridge", e);
        }
        return Response.status(Response.Status.BAD_REQUEST).build();
    }

    @POST
    @Path("/remove/{username}/{audiobridge}")
    public Response removeUserFromAudiobridge(@PathParam("audiobridge") String audiobridge, @PathParam("username") String username) throws ServiceException
    {
        try {
            meetController.removeUserFromAudiobridge(username, audiobridge);
            return Response.status(Response.Status.OK).build();

        } catch (Exception e) {
            Log.error("leaveAudiobridge", e);
        }
        return Response.status(Response.Status.BAD_REQUEST).build();
    }

    //-------------------------------------------------------
    //
    //  Jitsi Meet
    //
    //-------------------------------------------------------

    @POST
    @Path("/invite/{username}/{jid}")
    public Response inviteToJvb(@PathParam("username") String username, @PathParam("jid") String jid) throws ServiceException
    {
        try {

            if (meetController.inviteToJvb(username, jid))
            {
                return Response.status(Response.Status.OK).build();
            }

        } catch (Exception e) {
            Log.error("inviteToJvb", e);
        }
        return Response.status(Response.Status.BAD_REQUEST).build();
    }

    //-------------------------------------------------------
    //
    //  Custom Profile update/delete. Use chat/users to fetch
    //
    //-------------------------------------------------------

    @POST
    @Path("/profile")
    public Response setUserProperties(String properties) throws ServiceException
    {
        Log.info("setUserProperties " + properties);
        try {

            String username = getEndUser();
            User user = XMPPServer.getInstance().getUserManager().getUser(username);

            JSONArray profileProperties = new JSONArray(properties);

            for (int i = 0; i < profileProperties.length(); i++)
            {
                JSONObject property = profileProperties.getJSONObject(i);

                Log.info("setUserProperty " + username + " " + property.getString("name") + " " + property.getString("value"));

                if (property.getString("name") != null && property.getString("value") != null)
                {
                    user.getProperties().put(property.getString("name"), property.getString("value"));
                }
            }

        } catch (Exception e) {
            Log.error("setUserProperty", e);
            throw new ServiceException("Exception", e.getMessage(), ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
        }
        return Response.status(Response.Status.OK).build();
    }

    @DELETE
    @Path("/profile/{propertyName}")
    public Response deleteUserProperty(@PathParam("propertyName") String propertyName) throws ServiceException
    {
        try {
            User user = XMPPServer.getInstance().getUserManager().getUser(getEndUser());
            user.getProperties().remove(propertyName);

        } catch (Exception e) {
            Log.error("deleteUserProperty", e);
            throw new ServiceException("Exception", e.getMessage(), ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
        }
        return Response.status(Response.Status.OK).build();
    }

    //-------------------------------------------------------
    //
    //  Contacts/Friends
    //
    //-------------------------------------------------------

    @POST
    @Path("/friend")
    public Response createFriend(Friend friend) throws ServiceException
    {
        try {
            String username = getEndUser();
            String response = createFriendship(username, friend.getJid(), friend.getNickname(), friend.getGroups());

            if (response == null)
            {
                return Response.status(Response.Status.OK).build();
            }

        } catch (Exception e) {
            Log.error("createFriend", e);
        }
        return Response.status(Response.Status.BAD_REQUEST).build();
    }

    private String createFriendship(String username, String contactJid, String contactName, String groupList)
    {
        Log.debug("createFriendship " + username + " " + contactJid + " " + contactName + " " + groupList);

        String response = null;

        try {
            org.jivesoftware.openfire.roster.Roster roster = XMPPServer.getInstance().getRosterManager().getRoster(username);

            if (roster != null)
            {
                ArrayList<String> groups = new ArrayList<String>();

                if (groupList != null && !"".equals(groupList))
                {
                    String tokens[] = groupList.split(",");

                    for (int i=0; i<tokens.length; i++)
                    {
                       groups.add(tokens[i]);
                    }
                }

                JID toUserJid = new JID(contactJid);
                RosterItem gwitem = null;

                if (roster.isRosterItem(toUserJid) == false)
                {
                    Log.debug("create friendship " + username + " " + toUserJid + " " + contactName);
                    gwitem = roster.createRosterItem(toUserJid, true, true);

                } else {
                    Log.debug("update friendship " + username + " " + toUserJid + " " + contactName);
                    gwitem = roster.getRosterItem(toUserJid);
                }

                if (gwitem != null)
                {
                    gwitem.setSubStatus(RosterItem.SUB_BOTH);
                    gwitem.setAskStatus(RosterItem.ASK_NONE);
                    gwitem.setNickname(contactName);
                    gwitem.setGroups((List<String>) groups);

                    roster.updateRosterItem(gwitem);
                    roster.broadcast(gwitem, true);

                }
            }
        } catch (Exception e) {
            Log.error("createFriendship", e);
            response = e.toString();
        }
        return response;
    }

    private String getEndUser() throws ServiceException
    {
        String token = httpRequest.getHeader("authorization");

        Log.debug("getEndUser " + token);

        if (token != null)
        {
            String[] usernameAndPassword = BasicAuth.decode(token);

            if (usernameAndPassword != null && usernameAndPassword.length == 2)
            {

                return usernameAndPassword[0];
            }
        }

        throw new ServiceException("Access denied", "Exception", ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
    }

    //-------------------------------------------------------
    //
    //  SMS
    //
    //-------------------------------------------------------

    @POST
    @Path("/sms/{source}/{destination}")
    public Response sendSms(@PathParam("source") String source, @PathParam("destination") String destination, String body) throws ServiceException
    {
        try {

            if ("nexmo".equals(JiveGlobals.getProperty("ofchat.sms.provider", "nexmo")))
            {
                org.ifsoft.sms.nexmo.Servlet.smsOutgoing(destination, source, body);
                return Response.status(Response.Status.OK).build();
            }

        } catch (Exception e) {
            Log.error("sendSms", e);
        }
        return Response.status(Response.Status.BAD_REQUEST).build();
    }

    //-------------------------------------------------------
    //
    //  EMAIL
    //
    //-------------------------------------------------------

    @POST
    @Path("/email")
    public Response sendEmail(Email email) throws ServiceException
    {
        try {
            String response = sendEmailMessage(email.getToName(), email.getTo(), email.getFromName(), email.getFrom(), email.getSubject(), email.getTextBody(), email.getHtmlBody());

            if (response == null)
            {
                return Response.status(Response.Status.OK).build();
            }

        } catch (Exception e) {
            Log.error("sendEmail", e);
        }
        return Response.status(Response.Status.BAD_REQUEST).build();
    }

    public static String sendEmailMessage(String toName, String toEmail, String fromName, String fromEmail, String subject, String textBody, String htmlBody)
    {
        Log.debug("sendEmailMessage " + toName + " " + toEmail + " " + fromName + " " + fromEmail + " " + subject + "\n" + textBody);

        String response = null;

        // Check for errors in the given fields:
        if (toEmail == null || fromEmail == null || subject == null || (textBody == null && htmlBody == null))
        {
            response = "Error sending email: Invalid fields: "
                    + ((toEmail == null) ? "toEmail " : "")
                    + ((fromEmail == null) ? "fromEmail " : "")
                    + ((subject == null) ? "subject " : "")
                    + ((textBody == null && htmlBody == null) ? "textBody or htmlBody " : "");
            Log.error("sendMessage " + response);
        }
        else {
            try {
                String encoding = MimeUtility.mimeCharset("UTF-8");
                MimeMessage message = EmailService.getInstance().createMimeMessage();
                Address to;
                Address from;

                if (toName != null) {
                    to = new InternetAddress(toEmail, toName, encoding);
                }
                else {
                    to = new InternetAddress(toEmail, "", encoding);
                }

                if (fromName != null) {
                    from = new InternetAddress(fromEmail, fromName, encoding);
                }
                else {
                    from = new InternetAddress(fromEmail, "", encoding);
                }

                // Set the date of the message to be the current date
                SimpleDateFormat format = new SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss Z",
                        java.util.Locale.US);
                format.setTimeZone(JiveGlobals.getTimeZone());
                message.setHeader("Date", format.format(new Date()));
                message.setHeader("Content-Transfer-Encoding", "8bit");
                message.setRecipient(Message.RecipientType.TO, to);
                message.setFrom(from);
                message.setReplyTo(new javax.mail.Address[]{from});
                message.setSubject(StringUtils.replace(subject, "\n", ""), encoding);

                if (textBody != null && htmlBody != null)
                {
                    MimeMultipart content = new MimeMultipart("alternative");
                    // Plain-text
                    MimeBodyPart text = new MimeBodyPart();
                    text.setText(textBody, encoding);
                    text.setDisposition(Part.INLINE);
                    content.addBodyPart(text);
                    // HTML
                    MimeBodyPart html = new MimeBodyPart();
                    html.setContent(htmlBody, "text/html; charset=UTF-8");
                    html.setDisposition(Part.INLINE);
                   html.setHeader("Content-Transfer-Encoding", "8bit");
                    content.addBodyPart(html);
                    // Add multipart to message.
                    message.setContent(content);
                    message.setDisposition(Part.INLINE);
                    EmailService.getInstance().sendMessage(message);
                }
                else

                if (textBody != null) {
                    MimeBodyPart bPart = new MimeBodyPart();
                    bPart.setText(textBody, encoding);
                    bPart.setDisposition(Part.INLINE);
                   bPart.setHeader("Content-Transfer-Encoding", "8bit");
                    MimeMultipart mPart = new MimeMultipart();
                    mPart.addBodyPart(bPart);
                    message.setContent(mPart);
                    message.setDisposition(Part.INLINE);
                    // Add the message to the send list
                    EmailService.getInstance().sendMessage(message);
                }
                else

                if (htmlBody != null) {
                    MimeBodyPart bPart = new MimeBodyPart();
                    bPart.setContent(htmlBody, "text/html; charset=UTF-8");
                    bPart.setDisposition(Part.INLINE);
                    bPart.setHeader("Content-Transfer-Encoding", "8bit");
                    MimeMultipart mPart = new MimeMultipart();
                    mPart.addBodyPart(bPart);
                    message.setContent(mPart);
                    message.setDisposition(Part.INLINE);
                    // Add the message to the send list
                    EmailService.getInstance().sendMessage(message);
                }
            }
            catch (Exception e) {
                Log.error(e.getMessage(), e);
                response = e.toString();
            }
        }
        return response;
    }
}
