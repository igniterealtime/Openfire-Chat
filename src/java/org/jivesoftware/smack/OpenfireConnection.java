/**
 *
 * Copyright 2010 Jive Software.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.jivesoftware.smack;

import java.io.*;
import java.net.*;
import java.util.*;
import java.util.concurrent.*;
import javax.xml.bind.DatatypeConverter;
import java.text.SimpleDateFormat;

import javax.net.ssl.*;
import javax.security.auth.callback.*;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.ServletException;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.Response.Status;

import java.security.cert.Certificate;

import org.jivesoftware.util.JiveGlobals;
import org.jivesoftware.smack.*;
import org.jivesoftware.smack.roster.*;
import org.jivesoftware.smack.roster.packet.*;
import org.jivesoftware.smack.chat2.*;
import org.jivesoftware.smack.packet.*;
import org.jivesoftware.smack.filter.*;
import org.jivesoftware.smack.provider.*;
import org.jivesoftware.smack.util.*;

import org.jivesoftware.smackx.muc.*;
import org.jivesoftware.smackx.muc.packet.*;
import org.jivesoftware.smackx.chatstates.*;
import org.jivesoftware.smackx.chatstates.packet.ChatStateExtension;
import org.jivesoftware.smackx.*;
import org.jivesoftware.smackx.workgroup.*;
import org.jivesoftware.smackx.workgroup.user.*;
import org.jivesoftware.smackx.workgroup.agent.*;
import org.jivesoftware.smackx.workgroup.packet.*;
import org.jivesoftware.smackx.workgroup.ext.forms.*;
import org.jivesoftware.smackx.jiveproperties.JivePropertiesManager;

import org.jxmpp.jid.*;
import org.jxmpp.jid.impl.JidCreate;
import org.jxmpp.jid.parts.Resourcepart;
import org.jxmpp.stringprep.XmppStringprepException;

import org.jivesoftware.openfire.*;
import org.jivesoftware.openfire.session.ClientSession;
import org.jivesoftware.openfire.user.User;
import org.jivesoftware.openfire.user.UserAlreadyExistsException;
import org.jivesoftware.openfire.user.UserManager;
import org.jivesoftware.openfire.user.UserNotFoundException;
import org.jivesoftware.openfire.session.LocalClientSession;
import org.jivesoftware.openfire.net.VirtualConnection;
import org.jivesoftware.openfire.auth.UnauthorizedException;
import org.jivesoftware.openfire.auth.AuthToken;
import org.jivesoftware.openfire.auth.AuthFactory;
import org.jivesoftware.openfire.plugin.rest.*;
import org.jivesoftware.openfire.plugin.rest.entity.*;
import org.jivesoftware.openfire.sip.sipaccount.SipAccount;
import org.jivesoftware.openfire.sip.sipaccount.SipAccountDAO;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.xmpp.packet.JID;
import org.dom4j.*;

import net.sf.json.*;

import org.xmlpull.v1.XmlPullParser;
import org.xmlpull.v1.XmlPullParserFactory;

import org.eclipse.jetty.servlet.ServletHolder;
import org.eclipse.jetty.servlets.EventSource;
import org.eclipse.jetty.servlets.EventSourceServlet;

import org.ifsoft.meet.MeetController;
import org.jivesoftware.spark.plugin.fileupload.UploadRequest;



/**
 * A virtual implementation of {@link XMPPConnection}, intended to be used in
 * server side client session.
 *
 * Packets that should be processed by the client to simulate a received stanza
 * can be delivered using the {@linkplain #processStanza(Stanza)} method.
 * It invokes the registered stanza(/packet) interceptors and listeners.
 *
 * @see XMPPConnection
 * @author Guenther Niess
 */
public class OpenfireConnection extends AbstractXMPPConnection implements RosterListener, InvitationListener, InvitationRejectionListener, OfferListener {
    private static Logger Log = LoggerFactory.getLogger( "OpenfireConnection" );

    private static final ConcurrentHashMap<String, OpenfireConnection> connections = new ConcurrentHashMap<String, OpenfireConnection>();
    private static final ConcurrentHashMap<String, OpenfireConnection> users = new ConcurrentHashMap<String, OpenfireConnection>();

    private static final ConcurrentHashMap<String, AssistEntity> assits = new ConcurrentHashMap<String, AssistEntity>();
    private static final ConcurrentHashMap<String, Presence> workgroupPresence = new ConcurrentHashMap<String, Presence>();
    private static final ConcurrentHashMap<String, Workgroup> assistWorkgroups = new ConcurrentHashMap<String, Workgroup>();
    private static final ConcurrentHashMap<String, OpenfireConnection> assistConnections = new ConcurrentHashMap<String, OpenfireConnection>();

    private static final String DATE_FORMAT = "yyyyMMdd'T'HH:mm:ss";
    private final SimpleDateFormat dateFormat = new SimpleDateFormat(DATE_FORMAT);
    private static final String domain = XMPPServer.getInstance().getServerInfo().getXMPPDomain();
    private static final String hostname = XMPPServer.getInstance().getServerInfo().getHostname();

    private boolean reconnect = false;
    private LocalClientSession session;
    private SmackConnection smackConnection;
    private ServletHolder sseHolder;
    private ClientServlet clientServlet;
    private String ssePath;

    public ConcurrentHashMap<String, Chat> chats;
    public ConcurrentHashMap<String, MultiUserChat> groupchats;

    public MultiUserChatManager mucManager;
    public Roster roster;
    public OpenfireConfiguration config;
    public boolean autoStarted = false;

    private Workgroup wgroup;
    private AgentSession agentSession;
    private OfferListener offerListener;
    private Map<String, Offer> offerMap = new HashMap<String, Offer>();

    private StanzaListener stanzaListener;
    private ChatManager chatManager;

    public boolean anonymous = false;

    // -------------------------------------------------------
    //
    // Statics
    //
    // -------------------------------------------------------

    static {
        ProviderManager.addIQProvider("slot", UploadRequest.NAMESPACE, new UploadRequest.Provider());
        ProviderManager.addIQProvider("workgroups",     "http://jabber.org/protocol/workgroup", new AgentWorkgroups.Provider());
        ProviderManager.addIQProvider("agent-info",     "http://jabber.org/protocol/workgroup", new AgentInfo.Provider());
        ProviderManager.addIQProvider("offer",          "http://jabber.org/protocol/workgroup", new OfferRequestProvider());
        ProviderManager.addIQProvider("offer-revoke",   "http://jabber.org/protocol/workgroup", new OfferRevokeProvider());
        ProviderManager.addIQProvider("transcript",     "http://jabber.org/protocol/workgroup", new TranscriptProvider());
        ProviderManager.addIQProvider("transcripts",    "http://jabber.org/protocol/workgroup", new TranscriptsProvider());

        ProviderManager.addIQProvider(WorkgroupForm.ELEMENT_NAME, WorkgroupForm.NAMESPACE, new WorkgroupForm.InternalProvider());

        ProviderManager.addExtensionProvider(SessionID.ELEMENT_NAME, SessionID.NAMESPACE, new SessionID.Provider());
        ProviderManager.addExtensionProvider(QueueUpdate.ELEMENT_NAME, QueueUpdate.NAMESPACE, new QueueUpdate.Provider());
        ProviderManager.addExtensionProvider(QueueOverview.ELEMENT_NAME, QueueOverview.NAMESPACE, new QueueOverview.Provider());
        ProviderManager.addExtensionProvider(QueueDetails.ELEMENT_NAME, QueueDetails.NAMESPACE, new QueueDetails.Provider());
        ProviderManager.addExtensionProvider(MetaData.ELEMENT_NAME, MetaData.NAMESPACE, new MetaDataProvider());

        JivePropertiesManager.setJavaObjectEnabled(false);
    }

    public static OpenfireConnection createConnection(String username, String password, boolean anonymous)
    {
        try {

            if (!anonymous && username != null && password != null && !"".equals(username.trim()) && !"".equals(password.trim()))
            {
                AuthFactory.authenticate( username, password );
            }

        } catch ( Exception e ) {
            return null;
        }

        OpenfireConnection connection = users.get(username);

        if (connection == null)
        {
            try {
                OpenfireConfiguration config = OpenfireConfiguration.builder()
                  .setUsernameAndPassword(username, password)
                  .setXmppDomain(domain)
                  .setResource(username + (new Random(new Date().getTime()).nextInt()))
                  .setHost(hostname)
                  .setPort(0)
                  .build();

                connection = new OpenfireConnection(config);
                connection.anonymous = anonymous;

                Roster.getInstanceFor(connection).setSubscriptionMode(Roster.SubscriptionMode.accept_all);

                connection.connect();
                connection.login();

                final OpenfireConnection conn = connection;

                connection.stanzaListener = new StanzaListener()
                {
                    public void processStanza(Stanza packet) {
                        //conn.processMessageStanza(packet);
                    }
                };

                connection.addAsyncStanzaListener(connection.stanzaListener, new PacketTypeFilter(Message.class));
                connections.put(connection.getStreamId(), connection);

                users.put(username, connection);

                connection.chatManager = ChatManager.getInstanceFor(connection);

                connection.chatManager.addIncomingListener(new IncomingChatMessageListener()
                {
                  @Override public void newIncomingMessage(EntityBareJid from, Message message, Chat chat)
                  {
                        conn.chatCreated(from, message, chat);
                  }
                });

                connection.chats = new ConcurrentHashMap<String, Chat>();

                connection.mucManager = MultiUserChatManager.getInstanceFor(connection);
                connection.mucManager.addInvitationListener(connection);

                connection.roster = Roster.getInstanceFor(connection);
                connection.roster.addRosterListener(connection);


                connection.groupchats = new ConcurrentHashMap<String, MultiUserChat>();

            } catch (Exception e) {
                Log.error("createConnection", e);
            }
        }

        return connection;
    }

    public static OpenfireConnection getConnection(String streamId)
    {
        return connections.get(streamId);
    }

    public static OpenfireConnection getUserConnection(String username)
    {
        return users.get(username);
    }

    public static void removeAllConnections() throws SmackException
    {
        for (String streamId : connections.keySet())
        {
           removeConnection(streamId);
        }
    }


    public static OpenfireConnection removeConnection(String streamId) throws SmackException
    {
        OpenfireConnection connection = connections.remove(streamId);

        if (connection != null)
        {
            if (connection.agentSession != null)
            {
                try {
                    connection.agentSession.removeOfferListener(connection);
                    connection.agentSession.setOnline(false);
                } catch (Exception e) {
                    Log.error("removeConnection", e);
                }
            }

            users.remove(connection.getUsername());
            connection.removeAsyncStanzaListener(connection.stanzaListener);
            connection.disconnect(new Presence(Presence.Type.unavailable));
        }

        return connection;
    }

    public static RosterEntities getRosterEntities(String streamId) {
        Log.debug("getRoster " + streamId);

        List<RosterItemEntity> rosterEntities = new ArrayList<RosterItemEntity>();

        OpenfireConnection connection = connections.get(streamId);

        if (connection != null)
        {
            try {
                Collection<RosterEntry> entries = connection.roster.getEntries();

                for (RosterEntry entry : entries) {
                    Presence presence = connection.roster.getPresence(JidCreate.entityBareFrom(entry.getUser()));

                    int entryStatus = 0;

                    if (entry.getType() != null) {
                        if (entry.getType().equals(RosterPacket.ItemType.both))
                            entryStatus = 3;
                        if (entry.getType().equals(RosterPacket.ItemType.from))
                            entryStatus = 2;
                        if (entry.getType().equals(RosterPacket.ItemType.none))
                            entryStatus = 0;
                        if (entry.getType().equals(RosterPacket.ItemType.remove))
                            entryStatus = -1;
                        if (entry.getType().equals(RosterPacket.ItemType.to))
                            entryStatus = 1;
                    }

                    RosterItemEntity rosterItemEntity = new RosterItemEntity(entry.getUser(), entry.getName(), entryStatus);

                    List<String> groups = new ArrayList<String>();

                    for (RosterGroup group : entry.getGroups()) {
                        groups.add(group.getName());
                    }

                    rosterItemEntity.setGroups(groups);

                    String show = presence.getType().name();

                    if (presence.getMode() != null)
                        show = presence.getMode().toString();

                    rosterItemEntity.setStatus(presence.getStatus());
                    rosterItemEntity.setShow(show);
                    rosterEntities.add(rosterItemEntity);

                    Log.debug("Roster entry " + entry.getUser() + " " + entry.getName() + " "
                            + presence.getType().name() + " " + presence.getMode() + " " + presence.getStatus());
                }

            } catch (Exception e) {
                Log.error("getRoster", e);
                return null;
            }
        }

        return new RosterEntities(rosterEntities);
    }


    // -------------------------------------------------------
    //
    // OpenfireConnection
    //
    // -------------------------------------------------------


    public OpenfireConnection(OpenfireConfiguration configuration) {
        super(configuration);

        config = configuration;
        user = getUserJid();
    }

    public String getSsePath()
    {
        return ssePath;
    }

    @Override
    protected void connectInternal() {
        Log.debug("connectInternal " + config.getUsername());

        streamId = "ofchat" + new Random(new Date().getTime()).nextInt();
        smackConnection = new SmackConnection(streamId, this);

        if (reconnect) {
            //notifyReconnection();
        }

        clientServlet = new ClientServlet(config.getUsername() + "");
        sseHolder = new ServletHolder(clientServlet);
        sseHolder.setAsyncSupported(true);
        ssePath = "/" + config.getUsername();

        RESTServicePlugin.getInstance().addServlet(sseHolder, ssePath);

        connected = true;
        saslFeatureReceived.reportSuccess();
        tlsHandled.reportSuccess();
    }

    @Override
    protected void shutdown() {
        Log.debug("shutdown " + config.getUsername());

        user = null;
        authenticated = false;
        reconnect = true;

        try {
            JID userJid = XMPPServer.getInstance().createJID(getUsername(), config.getResource().toString());

            session = (LocalClientSession) SessionManager.getInstance().getSession(userJid);

            if (session != null)
            {
                session.close();
                SessionManager.getInstance().removeSession(session);
            }

            RESTServicePlugin.getInstance().removeServlets(sseHolder);

        } catch (Exception e) {
            Log.error("shutdown", e);
        }
    }

    @Override
    public boolean isSecureConnection() {
        return false;
    }

    @Override
    public boolean isUsingCompression() {
        return false;
    }

    @Override
    protected void loginInternal(String username, String password, Resourcepart resource) throws XMPPException
    {
        try {
            AuthToken authToken = null;

            if (username == null || password == null || "".equals(username) || "".equals(password))
            {
                String user = resource.toString();
                if (username != null && !"".equals(username)) user = username;
                authToken = new AuthToken(user, anonymous);

            } else {
                username = username.toLowerCase().trim();
                user = getUserJid();
                JID userJid = XMPPServer.getInstance().createJID(username, resource.toString());

                session = (LocalClientSession) SessionManager.getInstance().getSession(userJid);

                if (session != null)
                {
                    session.close();
                    SessionManager.getInstance().removeSession(session);
                }


                try {
                    authToken = AuthFactory.authenticate( username, password );

                } catch ( UnauthorizedException e ) {
                    authToken = new AuthToken(resource.toString(), true);
                }
            }

            session = SessionManager.getInstance().createClientSession( smackConnection, (Locale) null );
            smackConnection.setRouter( new SessionPacketRouter( session ) );
            session.setAuthToken(authToken, resource.toString());
            authenticated = true;

            afterSuccessfulLogin(false);

        } catch (Exception e) {
            Log.error("loginInternal", e);
        }
    }

    private void sendPacket(TopLevelStreamElement stanza)
    {
        sendPacket(stanza.toXML(StreamOpen.CLIENT_NAMESPACE).toString());
        firePacketSendingListeners((Stanza) stanza);
    }

    public void sendPacket(String data)
    {
        try {
            Log.debug("sendPacket " + data );
            smackConnection.getRouter().route(DocumentHelper.parseText(data).getRootElement());

        } catch ( Exception e ) {
            Log.error( "An error occurred while attempting to route the packet : ", e );
        }
    }

    @Override
    public void sendNonza(Nonza element) {
        TopLevelStreamElement stanza = (TopLevelStreamElement) element;
        sendPacket(stanza);
    }

    @Override
    protected void sendStanzaInternal(Stanza packet) {
        TopLevelStreamElement stanza = (TopLevelStreamElement) packet;
        sendPacket(stanza);
    }

    public void enableStreamFeature(ExtensionElement streamFeature) {
        addStreamFeature(streamFeature);
    }

    public boolean postMessage(String to, String body) {
        Log.debug("postMessage " + to + " " + body);

        try {
            Message message = new Message(to, body);
            sendStanza(message);
            return true;

        } catch (Exception e) {
            Log.error("postMessage", e);
            return false;
        }
    }

    public boolean postPresence(String show, String status) {
        Log.debug("postPresence " + show + " " + status);

        try {
            Presence p = new Presence(Presence.Type.available);

            if ("offline".equals(show)) {
                p = new Presence(Presence.Type.unavailable);
            } else if ("available".equals(show)) {
                p = new Presence(Presence.Type.available);
                p.setMode(Presence.Mode.available);
            } else if ("away".equals(show)) {
                p = new Presence(Presence.Type.available);
                p.setMode(Presence.Mode.away);
            } else if ("chat".equals(show)) {
                p = new Presence(Presence.Type.available);
                p.setMode(Presence.Mode.chat);
            } else if ("dnd".equals(show)) {
                p = new Presence(Presence.Type.available);
                p.setMode(Presence.Mode.dnd);
            } else if ("xa".equals(show)) {
                p = new Presence(Presence.Type.available);
                p.setMode(Presence.Mode.xa);
            }

            if (status != null) p.setStatus(status);
            sendPacket(p);
            return true;

        } catch (Exception e) {
            Log.error("setPresence", e);
            return false;
        }
    }

    private void chatCreated(EntityBareJid from, Message message, Chat chat)
    {
        String participant = from.toString();

        Log.debug("Chat created: " + participant);

        if (chats.containsKey(participant) == false)
        {
            chats.put(participant, chat);
        }
    }

    public boolean setCurrentState(String state, String to) {
        Log.debug("setCurrentState " + to + "\n" + state);

        try {
            Chat chat = chats.get(to);

            if (chat == null) {
                chat = chatManager.chatWith(JidCreate.entityBareFrom(to));
                chats.put(to, chat);
            }

            ChatState newState = null;

            if ("composing".equals(state))  newState = ChatState.composing;
            if ("paused".equals(state))     newState = ChatState.paused;
            if ("active".equals(state))     newState = ChatState.active;
            if ("inactive".equals(state))   newState = ChatState.inactive;
            if ("gone".equals(state))       newState = ChatState.gone;

            if (newState != null)
            {
                Message message = new Message();
                ChatStateExtension extension = new ChatStateExtension(newState);
                message.addExtension(extension);

                chat.send(message);
                return true;
            }

        } catch (Exception e) {
            Log.error("setCurrentState", e);
        }
        return false;
    }

    public boolean sendChatMessage(String message, String to) {
        Log.debug("sendChatMessage " + to + "\n" + message);

        try {
            Chat chat = chats.get(to);

            if (chat == null) {
                chat = chatManager.chatWith(JidCreate.entityBareFrom(to));
                chats.put(to, chat);
            }

            try {
                Message newMessage = new Message();

                JSONObject jsonBody = new JSONObject(message);

                if (jsonBody.has("body"))
                {
                    newMessage.setType(Message.Type.chat);
                    newMessage.setBody(jsonBody.getString("body"));
                }

                JivePropertiesManager.addProperty(newMessage, "data", message);
                chat.send(newMessage);
                return true;

            } catch (Exception e1) { }

            chat.send(message);
            return true;

        } catch (Exception e) {
            Log.error("sendChatMessage", e);
            return false;
        }
    }

    public void processMessageStanza(Stanza packet)
    {
        Log.debug("Received packet: \n" + packet.toXML(StreamOpen.CLIENT_NAMESPACE));

        try {
            Presence presence = (Presence) packet;

            if (presence != null)
            {
                ExtensionElement nq = presence.getExtension("notify-queue", "http://jabber.org/protocol/workgroup");

                if (nq != null) {
                    QueueOverview notifyQueue = (QueueOverview) nq;
                    clientServlet.broadcast("chatapi.ask", "{\"type\": \"notify-queue\", \"to\":\"" + presence.getTo() + "\", \"from\":\"" + presence.getFrom() + "\", \"averageWaitTime\":\"" + notifyQueue.getAverageWaitTime() + "\", \"userCount\":\"" + notifyQueue.getUserCount() + "\", \"status\":\"" + notifyQueue.getStatus() + "\", \"oldestEntry\": \"" + dateFormat.format(notifyQueue.getOldestEntry()) + "\"}");
                }

                ExtensionElement nqd = presence.getExtension("notify-queue-details", "http://jabber.org/protocol/workgroup");

                if (nqd != null) {
                    QueueDetails notifyQueueDetails = (QueueDetails) nqd;
                    Set<QueueUser> users = notifyQueueDetails.getUsers();

                    synchronized (users)
                    {
                        for (Iterator<QueueUser> i = users.iterator(); i.hasNext(); )
                        {
                            QueueUser user = i.next();
                            int position = user.getQueuePosition();
                            int timeRemaining = user.getEstimatedRemainingTime();
                            Date timestamp = user.getQueueJoinTimestamp();

                            clientServlet.broadcast("chatapi.ask", "{\"type\": \"notify-queue-details\", \"to\":\"" + presence.getTo() + "\", \"from\":\"" + presence.getFrom() + "\", \"userid\":\"" + user.getUserID() + "\", \"postion\":\"" + position + "\", \"timeRemaining\":\"" + timeRemaining + "\", \"timestamp\": \"" + dateFormat.format(timestamp) + "\"}");
                        }
                    }
                }

                clientServlet.broadcast("chatapi.presence", "{\"type\": \"presence\", \"to\":\"" + presence.getTo() + "\", \"from\":\"" + presence.getFrom() + "\", \"status\":\"" + presence.getStatus() + "\", \"show\": \"" + presence.getMode() + "\"}");
                return;
            }
        } catch (Exception e) {}

        try {
            Message message = (Message) packet;

            if (message != null)
            {
                ExtensionElement departQueue = message.getExtension("depart-queue", "http://jabber.org/protocol/workgroup");
                ExtensionElement queueStatus = message.getExtension("queue-status", "http://jabber.org/protocol/workgroup");
                ExtensionElement element = message.getExtension("http://jabber.org/protocol/chatstates");

                if (departQueue != null) {
                    clientServlet.broadcast("chatapi.ask", "{\"type\": \"depart-queue\", \"to\":\"" + message.getTo() + "\", \"from\":\"" + message.getFrom() + "\"}");
                }
                else

                if (queueStatus != null)
                {
                    QueueUpdate queueUpdate = (QueueUpdate) queueStatus;
                    clientServlet.broadcast("chatapi.ask", "{\"type\": \"update-queue\", \"to\":\"" + message.getTo() + "\", \"from\":\"" + message.getFrom() + "\", \"remaingTime\":\"" + queueUpdate.getRemaingTime() + "\", \"position\": \"" + queueUpdate.getPosition() + "\"}");
                }
                else

                if (element != null)
                {
                    clientServlet.broadcast("chatapi.chat", "{\"type\": \"" + message.getType() + "\", \"to\":\"" + message.getTo() + "\", \"from\":\"" + message.getFrom() + "\", \"state\": \"" + element.getElementName() + "\"}");
                }

                if (message.getType() == Message.Type.groupchat)
                {
                    if (message.getBody() != null)
                    {
                        String data = (String) JivePropertiesManager.getProperty(message, "data");
                        clientServlet.broadcast("chatapi.muc", "{\"type\": \"" + message.getType() + "\", \"to\":\"" + message.getTo() + "\", \"from\":\"" + message.getFrom() + "\", \"data\":" + data + ", \"body\": \"" + message.getBody() + "\"}");
                    }

                    if (autoStarted)
                    {
                        MeetController.getInstance().postWebPush(getUsername(), "{\"title\":\"" + message.getFrom() + "\", \"url\": \"\", \"message\": \"" + message.getBody() + "\"}");
                    }
                }
                else {

                    if (message.getBody() != null)
                    {
                        String data = (String) JivePropertiesManager.getProperty(message, "data");
                        clientServlet.broadcast("chatapi.chat", "{\"type\": \"" + message.getType() + "\", \"to\":\"" + message.getTo() + "\", \"from\":\"" + message.getFrom() + "\", \"data\":" + data + ", \"body\": \"" + message.getBody() + "\"}");

                    } else {

                        GroupChatInvitation invitation = (GroupChatInvitation)packet.getExtension(GroupChatInvitation.ELEMENT, GroupChatInvitation.NAMESPACE);

                        if (invitation != null)
                        {
                            try {
                                String room = invitation.getRoomAddress();
                                String url = JiveGlobals.getProperty("ofmeet.root.url.secure", "https://" + hostname + ":" + JiveGlobals.getProperty("httpbind.port.secure", "7443")) + "/meet/" + room.split("@")[0];
                                clientServlet.broadcast("chatapi.muc", "{\"type\": \"invitationReceived\", \"room\":\"" + room + "\", \"inviter\":\"" + message.getFrom() + "\", \"to\":\"" + message.getTo() + "\", \"from\":\"" + message.getFrom() + "\", \"url\":\"" + url + "\", \"reason\": \"" + message.getBody() + "\"}");

                            } catch (Exception e) {
                                Log.error("invitationReceived", e);
                            }
                        }
                        else {
                            String data = (String) JivePropertiesManager.getProperty(message, "data");

                            if (data != null)
                            {
                                clientServlet.broadcast("chatapi.notify", "{\"type\": \"notify\", \"to\":\"" + message.getTo() + "\", \"from\":\"" + message.getFrom() + "\", \"data\":" + data + "}");
                            }
                        }
                    }
                }
                return;
            }
        } catch (Exception e) {}
    }

    // -------------------------------------------------------
    //
    // RosterListener
    //
    // -------------------------------------------------------

    @Override
    public void entriesAdded(Collection<Jid> addresses) {}

    @Override
    public void entriesDeleted(Collection<Jid> addresses) {}

    @Override
    public void entriesUpdated(Collection<Jid> addresses) {}

    @Override
    public void presenceChanged(Presence presence) {}

    // -------------------------------------------------------
    //
    // InvitationListener
    //
    // -------------------------------------------------------

    @Override
    public void invitationReceived(XMPPConnection xmppConnection, MultiUserChat multiUserChat, EntityJid inviter, String reason, String password, Message message, MUCUser.Invite invitation)
    {
        try {
            String room = multiUserChat.getRoom().toString();
            String url = JiveGlobals.getProperty("ofmeet.root.url.secure", "https://" + hostname + ":" + JiveGlobals.getProperty("httpbind.port.secure", "7443")) + "/meet/" + room.split("@")[0];
            clientServlet.broadcast("chatapi.muc", "{\"type\": \"invitationReceived\", \"password\":\"" + password + "\", \"room\":\"" + room + "\", \"inviter\":\"" + inviter + "\", \"to\":\"" + message.getTo() + "\", \"from\":\"" + message.getFrom() + "\", \"url\":\"" + url + "\", \"reason\": \"" + reason + "\"}");

        } catch (Exception e) {
            Log.error("invitationReceived", e);
        }
    }

    @Override
    public void invitationDeclined(EntityBareJid jid, String reason, Message message, MUCUser.Decline decline) {
        Log.debug("invitationDeclined " + jid);
    }

    // -------------------------------------------------------
    //
    // Groupchat/ Chat rooms
    //
    // -------------------------------------------------------

    public boolean joinRoom(String mGroupChatName, String mNickName) {
        Log.debug("joinRoom " + mGroupChatName + " " + mNickName);

        try {
            MultiUserChat mMultiUserChat = groupchats.get(mGroupChatName);

            if (mMultiUserChat == null)
            {
                mMultiUserChat = mucManager.getMultiUserChat(JidCreate.entityBareFrom(mGroupChatName));
                mMultiUserChat.addInvitationRejectionListener(this);
                groupchats.put(mGroupChatName, mMultiUserChat);
            }

            mMultiUserChat.join(Resourcepart.from(mNickName));
            return true;

        } catch (Exception e) {
            Log.error("joinRoom", e);
            return false;
        }
    }

    public boolean leaveRoom(String mGroupChatName) {
        Log.debug("leaveRoom " + mGroupChatName);

        try {
            MultiUserChat mMultiUserChat = groupchats.get(mGroupChatName);
            mMultiUserChat.leave();
            return true;

        } catch (Exception e) {
            Log.error("leaveRoom", e);
            return false;
        }
    }

    public boolean sendRoomMessage(String mGroupChatName, String text) {
        Log.debug("sendRoomMessage " + mGroupChatName + "\n" + text);

        try {
            if (text.startsWith("{") && text.endsWith("}"))
            {
                try {
                    Message newMessage = new Message();
                    JSONObject jsonBody = new JSONObject(text);

                    if (jsonBody.has("body"))
                    {
                        newMessage.setType(Message.Type.groupchat);
                        newMessage.setBody(jsonBody.getString("body"));
                    }

                    JivePropertiesManager.addProperty(newMessage, "data", text);
                    groupchats.get(mGroupChatName).sendMessage(newMessage);
                    return true;
                } catch (Exception e1) { }
            }
            groupchats.get(mGroupChatName).sendMessage(text);
            return true;

        } catch (Exception e) {
            Log.error("sendRoomMessage", e);
            return false;
        }
    }

    public boolean inviteToRoom(String mGroupChatName, String inviteJid, String reason) {
        Log.debug("inviteToRoom " + mGroupChatName + " " + inviteJid + "\n" + reason);

        try {
            groupchats.get(mGroupChatName).invite(JidCreate.entityBareFrom(inviteJid), reason);
            return true;

        } catch (Exception e) {
            Log.error("inviteToRoom", e);
            return false;
        }
    }

    // -------------------------------------------------------
    //
    // Workgroup Agents
    //
    // -------------------------------------------------------

    public Workgroup getWorkgroup() {
        return wgroup;
    }

    public AgentSession getAgentSession() {
        return agentSession;
    }

    public boolean joinWorkgroup(String workgroup)
    {
        Log.debug("joinWorkgroup " + workgroup);

        if (agentSession != null && agentSession.isOnline())
        {
            try {
                agentSession.setOnline(false);
                agentSession.setOnline(true);
            }
            catch (Exception e) {
                Log.error("joinWorkgroup", e);
                return false;
            }
        }
        else {

            try {
                agentSession = new AgentSession(JidCreate.entityBareFrom(workgroup), this);
                agentSession.addOfferListener(this);
                agentSession.setOnline(true);
            }
            catch (Exception e1) {
                Log.error("joinWorkgroup", e1);
                return false;
            }
        }

        Presence toWorkgroupPresence = new Presence(Presence.Type.available, "online", 1, Presence.Mode.available);
        toWorkgroupPresence.setTo(workgroup);

        try {
            sendPacket(toWorkgroupPresence);
            wgroup = new Workgroup(JidCreate.entityBareFrom(workgroup), this);
        }
        catch (Exception e) {
            Log.error("joinWorkgroup", e);
            return false;
        }

        agentSession.addOfferListener(this);
        return true;
    }

    public boolean leaveWorkgroup(String workgroup)
    {
        if (agentSession != null && agentSession.isOnline())
        {
            Log.debug("leaveWorkgroup " + workgroup);
            try {
                agentSession.setOnline(false);
                return true;
            }
            catch (Exception e) {
                Log.error("leaveWorkgroup", e);
                return false;
            }
        }
        return false;
    }

    public boolean acceptOffer(String offerId)
    {
        if (offerMap.containsKey(offerId) && agentSession != null && agentSession.isOnline())
        {
            Log.debug("acceptOffer " + offerId);
            try {
                offerMap.get(offerId).accept();
                return true;
            }
            catch (Exception e) {
                Log.error("acceptOffer", e);
                return false;
            }
        }
        return false;
    }

    public boolean rejectOffer(String offerId)
    {
        if (offerMap.containsKey(offerId) && agentSession != null && agentSession.isOnline())
        {
            Log.debug("rejectOffer " + offerId);

            try {
                offerMap.get(offerId).reject();
                return true;
            }
            catch (Exception e) {
                Log.error("rejectOffer", e);
                return false;
            }
        }
        return false;
    }

    public void offerReceived(final Offer offer)
    {
        Map metaData = offer.getMetaData();

        Log.debug("offerReceived " + offer.getSessionID() + " " + metaData);

        offerMap.put(offer.getSessionID(), offer);

        JSONObject jsonMetadata = new JSONObject();

        for (Object key : metaData.keySet())
        {
            String parameter = (String) key;
            ArrayList values = (ArrayList) metaData.get(parameter);
            jsonMetadata.put(parameter, values.get(0));
        }

        clientServlet.broadcast("chatapi.assist", "{\"type\": \"offerReceived\", \"workgroup\":\"" + offer.getWorkgroupName() + "\", \"id\":\"" + offer.getSessionID() + "\", \"from\":\"" + offer.getUserJID() + "\", \"metaData\": " + jsonMetadata.toString() + "}");
    }

    public void offerRevoked(final RevokedOffer offer)
    {
        Log.debug("offerRevoked " + offer.getSessionID());

        offerMap.remove(offer.getSessionID());
        clientServlet.broadcast("chatapi.assist", "{\"type\": \"offerRevoked\", \"workgroup\":\"" + offer.getWorkgroupName() + "\", \"id\":\"" + offer.getSessionID() + "\", \"from\":\"" + offer.getUserJID() + "\", \"reason\": \"" + offer.getReason() + "\"}");
    }


    public WorkgroupEntities getWorkgroups(String jid, String service) {
        Log.debug("getWorkgroups " + jid + " " + service);

        Collection<String> workgroups = new ArrayList<String>();

        try {
            workgroups = Agent.getWorkgroups(JidCreate.from(service), JidCreate.entityBareFrom(jid), this);

        } catch (Exception e) { // no need to trap error
            Log.error("getWorkgroups", e);
        }

        return new WorkgroupEntities(workgroups);
    }

    public AssistQueues getQueues() {
        Log.debug("getQueues ");

        List<AssistQueue> queues = new ArrayList<AssistQueue>();

        if (agentSession != null && agentSession.isOnline())
        {
            try {
                Iterator<WorkgroupQueue> iter = agentSession.getQueues();

                while(iter.hasNext())
                {
                    WorkgroupQueue queue = iter.next();
                    AssistQueue assistQueue = new AssistQueue(queue.getName().toString(), queue.getStatus().toString(), queue.getAverageWaitTime(), queue.getOldestEntry(), queue.getMaxChats(), queue.getCurrentChats());

                    Iterator<QueueUser> iter2 = queue.getUsers();
                    List<QueueItem> users = new ArrayList<QueueItem>();

                    while(iter2.hasNext())
                    {
                        QueueUser user = iter2.next();
                        users.add(new QueueItem (user.getUserID(), user.getQueuePosition(), user.getEstimatedRemainingTime(), user.getQueueJoinTimestamp()));
                    }

                    assistQueue.setUsers(users);
                    queues.add(assistQueue);
                }
            }
            catch (Exception e) {
                Log.error("getQueues", e);
            }
        }

        return new AssistQueues(queues);
    }

    // -------------------------------------------------------
    //
    // Upload
    //
    // -------------------------------------------------------

    public static JSONObject getUploadRequest(String userId, String fileName, long fileLength) throws XMPPException {
        Log.debug("getUploadRequest " + fileName + " " + fileLength);

        JSONObject resp = new JSONObject();
        String errorMsg = null;

        try {
            UploadRequest request = new UploadRequest(fileName, fileLength);
            request.setTo("httpfileupload." + domain);
            request.setType(IQ.Type.get);

            OpenfireConnection uploadConnection = getXMPPConnection(userId, null);

            if (uploadConnection != null)
            {
                StanzaCollector collector = uploadConnection.createStanzaCollector(new PacketIDFilter(request.getPacketID()));

                uploadConnection.sendPacket(request);

                IQ result = (IQ) collector.nextResult(5000);
                collector.cancel();

                if (result == null) {
                   errorMsg = "No response from the server.";
                   Log.error(errorMsg);
                   resp.put("error", errorMsg);
                   return resp;
                }
                if (result.getType() == IQ.Type.error) {
                   errorMsg = result.getError().getConditionText();

                   if (errorMsg == null)
                   {
                        if (result.getError().getCondition() == StanzaError.Condition.not_acceptable)
                        {
                            errorMsg = "File too large.";
                        }
                        else errorMsg = result.getError().toString();
                   }

                   Log.error(errorMsg);
                   resp.put("error", errorMsg);
                   return resp;
                }

                UploadRequest response = (UploadRequest) result;

                Log.warn("handleUpload response " + response.putUrl + " " + response.getUrl);
                resp.put("get", response.getUrl);
                resp.put("put", response.putUrl);

                uploadConnection.disconnect(new Presence(Presence.Type.unavailable));
                assistConnections.remove(userId);

                return resp;

            } else {
                resp.put("error", "upload failed. No XMPP connection");
                return resp;
            }

        } catch (Exception e) {
            Log.error("uploadFile error", e);
            resp.put("error", e.toString());
            return resp;
        }
    }

    // -------------------------------------------------------
    //
    // Workgroup Users
    //
    // -------------------------------------------------------

    public static boolean joinAssistChat(String userid) throws XMPPException {
        Log.debug("joinAssistChat " + userid);

        AssistEntity assistance = assits.get(userid);

        if (assistance != null) {
            try {
                assistance.getChatroom().join(Resourcepart.from(userid));
            } catch (Exception e) {
                Log.error("joinAssistChat", e);
                return false;
            }
            return true;
        }
        return false;
    }

    public static boolean sendAssistMessage(String userid, String text) throws XMPPException {
        Log.debug("sendAssistMessage " + userid);

        AssistEntity assistance = assits.get(userid);

        if (assistance != null) {
            try {
                assistance.getChatroom().sendMessage(text);
            } catch (Exception e) {
                Log.error("sendAssistMessage", e);
                return false;
            }
            return true;
        }
        return false;
    }

    public static AskQueue queryAssistance(String userid) {
        Log.debug("queryAssistance " + userid);

        AssistEntity assistance = assits.get(userid);

        if (assistance != null)
        {
            String workgroupName = assistance.getWorkgroup() + "@workgroup." + domain;
            OpenfireConnection assistConnection = getXMPPConnection(userid, workgroupName);

            if (assistConnection != null) {
                try {
                    Workgroup workgroup = getWorkgroup(assistance, assistConnection);

                    if (workgroup != null) {
                        return new AskQueue(workgroup.getWorkgroupJID().toString(), workgroup.isInQueue(), workgroup.isAvailable(),
                                workgroup.getQueuePosition(), workgroup.getQueueRemainingTime());
                    }
                } catch (Exception e) {
                    Log.error("queryAssistance", e);
                    return null;
                }
            }
        }

        return null;
    }

    public static String revokeAssistance(String userid) throws XMPPException {
        Log.debug("revoveAssistance " + userid);

        try {
            AssistEntity assistance = assits.remove(userid);

            if (assistance != null) {
                if (assistance.getChatroom() != null) {
                    assistance.getChatroom().leave();
                }

                Workgroup workgroup = (Workgroup) assistWorkgroups.remove(assistance.getWorkgroup() + "-" + assistance.getUserID());

                if (workgroup != null && assistance.getChatroom() == null) {
                    workgroup.departQueue();
                    assistance.setGroupchat("revoked");
                }

            } else
                return "Assistance not found for " + userid;

            OpenfireConnection assistConnection = (OpenfireConnection) assistConnections.remove(userid);

            if (assistConnection != null) {
                assistConnection.disconnect(new Presence(Presence.Type.unavailable));

            } else return "Connection unavailable for " + userid;

        } catch (Exception e) {
            Log.error("revokeAssistance", e);
        }

        return null;
    }

    public static String requestAssistance(AssistEntity assistance) {
        Log.debug("requestAssistance \n" + assistance.getWorkgroup() + " " + assistance.getUserID() + " "
                + assistance.getEmailAddress() + " " + assistance.getQuestion());

        if (assistance.getWorkgroup() == null || assistance.getUserID() == null || assistance.getEmailAddress() == null
                || assistance.getQuestion() == null) {
            return "workgroup, username, email and question must be provided";
        }

        String userid = assistance.getUserID();
        String workgroupName = assistance.getWorkgroup() + "@workgroup." + domain;

        OpenfireConnection assistConnection = getXMPPConnection(userid, workgroupName);

        if (assistConnection != null) {
            Workgroup workgroup = getWorkgroup(assistance, assistConnection);

            if (workgroup != null) {
                if (isOnline(assistance, assistConnection)) {
                    Map details = new HashMap();
                    details.put("username", userid);
                    details.put("email", assistance.getEmailAddress());
                    details.put("question", assistance.getQuestion());

                    try {
                        assistance.setGroupchat(null);
                        assits.put(userid, assistance);

                        workgroup.joinQueue(details, JidCreate.entityBareFrom(assistConnection.getConfig().getResource() + "@" + assistConnection.getConfig().getXMPPServiceDomain()));

                        int counter = 0;

                        while (assistance.getGroupchat() == null && counter < 180) {
                            try {
                                Thread.sleep(1000);
                            } catch (InterruptedException ie) {
                            }

                            counter++;
                        }

                        if (counter < 180) {
                            return null;

                        } else {
                            Log.warn("requestAssistance no agent responded " + workgroupName);
                            return "Timeout error, no agent available";
                        }
                    } catch (Exception e) {
                        Log.error("Unable to join chat queue." + workgroupName, e);
                        return "Unable to join chat queue - " + e;
                    }

                } else {
                    Log.warn("requestAssistance workgroup is offline " + workgroupName);
                    return "Workgroup is offline";

                }
            } else {
                Log.error("requestAssistance workgroup is not configured " + workgroupName);
                return "Workgroup is not configured";
            }

        } else {
            Log.error("requestAssistance cannot create xmpp conection " + userid);
            return null;
        }
    }

    private static OpenfireConnection getXMPPConnection(final String userid, final String workgroupName) {
        if (assistConnections.containsKey(userid) == false) {
            try {
                OpenfireConfiguration config = OpenfireConfiguration.builder()
                  .setUsernameAndPassword(userid, null)
                  .setXmppDomain(domain)
                  .setResource(userid)
                  .setHost(hostname)
                  .setPort(0)
                  .build();

                final OpenfireConnection connection = new OpenfireConnection(config);
                connection.anonymous = true;
                connection.connect();

                connection.mucManager = MultiUserChatManager.getInstanceFor(connection);

                connection.addAsyncStanzaListener(new StanzaListener() {
                    public void processStanza(Stanza packet) {
                        Message message = (Message) packet;

                        if (message.getType() == Message.Type.groupchat && message.getBody() != null) {
                            Log.debug("Ask grpupchat message: " + message.getFrom() + "\n" + message.getBody());
                            connection.clientServlet.broadcast("chatapi.ask", "{\"type\": \"" + message.getType() + "\", \"to\":\"" + message.getTo()
                                            + "\", \"from\":\"" + message.getFrom() + "\", \"body\": \""
                                            + message.getBody() + "\"}");
                        }
                    }

                }, new PacketTypeFilter(Message.class));

                if (workgroupName != null)
                {
                    StanzaFilter presenceFilter = new StanzaTypeFilter(Presence.class);
                    StanzaFilter fromFilter = FromMatchesFilter.create(JidCreate.entityBareFrom(workgroupName));
                    StanzaFilter andFilter = new AndFilter(fromFilter, presenceFilter);

                    connection.addAsyncStanzaListener(new StanzaListener() {
                        public void processStanza(Stanza packet) {
                            Presence presence = (Presence) packet;
                            workgroupPresence.put(workgroupName, presence);
                        }
                    }, andFilter);
                }

                connection.login();
                assistConnections.put(userid, connection);

            } catch (Exception e) {
                Log.error("getXMPPConnection", e);
                return null;
            }
        }

        return assistConnections.get(userid);
    }

    private static Workgroup getWorkgroup(AssistEntity assistance, final OpenfireConnection assistConnection) {
        String key = assistance.getWorkgroup() + "-" + assistance.getUserID();
        String workgroupName = assistance.getWorkgroup() + "@workgroup." + domain;

        Workgroup workgroup = (Workgroup) assistWorkgroups.get(key);

        if (workgroup == null) {
            try {
                workgroup = new Workgroup(JidCreate.entityBareFrom(workgroupName), assistConnection);

                workgroup.addInvitationListener(new WorkgroupInvitationListener() {
                    public void invitationReceived(WorkgroupInvitation workgroupInvitation) {
                        Log.debug("invitationReceived " + workgroupInvitation.getGroupChatName() + " "
                                + workgroupInvitation.getUniqueID() + " " + workgroupInvitation.getInvitationSender() + " "
                                + workgroupInvitation.getMetaData() + "\n" + workgroupInvitation.getMessageBody());

                        String room = workgroupInvitation.getGroupChatName().toString().split("@")[0];
                        String jid = workgroupInvitation.getUniqueID().toString();
                        String userid = jid.split("@")[0];

                        AssistEntity assist = assits.get(userid);

                        if (assist != null) {
                            assist.setGroupchat(workgroupInvitation.getGroupChatName().toString());
                            String url = JiveGlobals.getProperty("ofmeet.root.url.secure",
                                    "https://" + hostname + ":"
                                            + JiveGlobals.getProperty("httpbind.port.secure", "7443"))
                                    + "/meet/" + room;
                            assist.setUrl(url);

                            try {
                                MultiUserChat assistRoom = assistConnection.mucManager.getMultiUserChat((EntityBareJid)workgroupInvitation.getGroupChatName());
                                assist.setChatroom(assistRoom);

                            } catch (Exception e) {
                                Log.error("invitationReceived ", e);
                            }
                            assist.setMessage(workgroupInvitation.getMessageBody());
                            assist.setSender(workgroupInvitation.getInvitationSender().toString());

                            // TODO anonymous SSE
                            assistConnection.clientServlet.broadcast("chatapi.ask", "{\"type\": \"offer\", \"to\":\"" + jid + "\", \"from\":\""
                                            + workgroupInvitation.getInvitationSender() + "\", \"url\":\"" + url
                                            + "\", \"mucRoom\": \"" + workgroupInvitation.getGroupChatName() + "\"}");
                        }
                    }
                });

                assistWorkgroups.put(key, workgroup);

            } catch (Exception e) {
                Log.error("getWorkgroup", e);
            }
        }

        return workgroup;
    }

    private static boolean isOnline(AssistEntity assistance, OpenfireConnection assistConnection) {
        String key = assistance.getWorkgroup() + "-" + assistance.getUserID();
        final String workgroupName = assistance.getWorkgroup() + "@workgroup." + domain;

        try {
            Presence presence = workgroupPresence.get(workgroupName);

            if (presence == null) {
                Workgroup workgroup = getWorkgroup(assistance, assistConnection);
                boolean isAvailable = true; //workgroup.isAvailable();
                presence = new Presence(isAvailable ? Presence.Type.available : Presence.Type.unavailable);
                workgroupPresence.put(workgroupName, presence);
                return isAvailable;
            }

            return presence != null && presence.getType() == Presence.Type.available;

        } catch (Exception e) {
            Log.error("isOnline", e);
            return false;
        }
    }


    // -------------------------------------------------------
    //
    // Common
    //
    // -------------------------------------------------------


    private EntityFullJid getUserJid()
    {
        try {
            return JidCreate.entityFullFrom(config.getUsername() + "@" + config.getXMPPServiceDomain() + "/" + config.getResource());
        }
        catch (XmppStringprepException e) {
            throw new IllegalStateException(e);
        }
    }

    public OpenfireConfiguration getConfig()
    {
        return config;
    }

    public String getUsername()
    {
        return config.getUsername().toString();
    }

    public Stanza handleParser(String xml)
    {
        Stanza stanza = null;

        try {
            stanza = PacketParserUtils.parseStanza(xml);
        }
        catch (Exception e) {
                Log.error("handleParser failed");
        }

        if (stanza != null) {
            invokeStanzaCollectorsAndNotifyRecvListeners(stanza);
        }

        return stanza;
    }

    // -------------------------------------------------------
    //
    // SmackConnection
    //
    // -------------------------------------------------------

    public class SmackConnection extends VirtualConnection
    {
        private SessionPacketRouter router;
        private String remoteAddr;
        private String hostName;
        private LocalClientSession session;
        private boolean isSecure = false;
        private OpenfireConnection connection;

        public SmackConnection(String hostName, OpenfireConnection connection)
        {
            this.remoteAddr = hostName;
            this.hostName = hostName;
            this.connection = connection;
        }

        public void setConnection(OpenfireConnection connection) {
            this.connection = connection;
        }

        public boolean isSecure() {
            return isSecure;
        }

        public void setSecure(boolean isSecure) {
            this.isSecure = isSecure;
        }

        public SessionPacketRouter getRouter()
        {
            return router;
        }

        public void setRouter(SessionPacketRouter router)
        {
            this.router = router;
        }

        public void closeVirtualConnection()
        {
            Log.debug("SmackConnection - close ");

            if (this.connection!= null) this.connection.shutdown();
        }

        public byte[] getAddress() {
            return remoteAddr.getBytes();
        }

        public String getHostAddress() {
            return remoteAddr;
        }

        public String getHostName()  {
            return ( hostName != null ) ? hostName : "0.0.0.0";
        }

        public void systemShutdown() {

        }

        public void deliver(org.xmpp.packet.Packet packet) throws UnauthorizedException
        {
            deliverRawText(packet.toXML());
        }

        public void deliverRawText(String text)
        {
            int pos = text.indexOf("<message ");

            if (pos > -1)
            {
                text = text.substring(0, pos + 9) + "xmlns=\"jabber:client\"" + text.substring(pos + 8);
            }

            Log.debug("SmackConnection - deliverRawText\n" + text);

            if (clientServlet != null)
            {
                clientServlet.broadcast("chatapi.xmpp", "{\"xmpp\": \"" + DatatypeConverter.printBase64Binary(text.getBytes()) + "\"}");
            }

            Stanza stanza = connection.handleParser(text);

            if (stanza != null)
            {
                processMessageStanza(stanza);
            }
        }

        @Override
        public org.jivesoftware.openfire.spi.ConnectionConfiguration getConfiguration()
        {
            // TODO Here we run into an issue with the ConnectionConfiguration introduced in Openfire 4:
            //      it is not extensible in the sense that unforeseen connection types can be added.
            //      For now, null is returned, as this object is likely to be unused (its lifecycle is
            //      not managed by a ConnectionListener instance).
            return null;
        }

        public Certificate[] getPeerCertificates() {
            return null;
        }

    }

    // -------------------------------------------------------
    //
    // ClientServlet
    //
    // -------------------------------------------------------

    public class ClientServlet extends EventSourceServlet
    {
        private ClientEventSource clientEventSource = null;
        private String username = null;
        private User user = null;
        private String sipDomain = null;
        private String sipProfile = null;
        private SipAccount sipAccount = null;

        public ClientServlet(String username)
        {
            UserManager userManager = XMPPServer.getInstance().getUserManager().getInstance();
            this.username = username;

            try {
                this.user = userManager.getUser(username);
            } catch (Exception e) { }

            this.sipProfile = JiveGlobals.getProperty("freeswitch.sip.internal", "internal");

            boolean freeswitchEnabled = JiveGlobals.getBooleanProperty("freeswitch.enabled", false);

            if (freeswitchEnabled)
            {
                try {
                    this.sipAccount = SipAccountDAO.getAccountByUser(username);
                } catch (Exception e) {
                    Log.error("ClientServlet", e);
                }
            }
        }

        public void broadcast(String name, String event)
        {
            if (clientEventSource != null)
            {
                for (EventSource.Emitter emitter : clientEventSource.emitters)
                {
                    try
                    {
                        emitter.event(name, event);
                    }
                    catch (IOException e)
                    {
                        Log.error("could not send update to client", e);
                    }
                }
            }

            if (sipAccount != null)
            {
                String json = "{\"event\": \"" + name + "\", \"payload\": " + event + "}";
                RESTServicePlugin.getInstance().sendAsyncFWCommand("chat sip|freeswitch|" + sipProfile + "/" + sipAccount.getSipUsername() + "@" + sipAccount.getServer() + "|" + json);
            }
        }

        public User getUser()
        {
            return user;
        }

        @Override
        public void init() throws ServletException
        {
            super.init();
        }

        @Override
        public void destroy()
        {
            if (clientEventSource != null) clientEventSource.emitters.clear();
            super.destroy();
        }

        @Override
        protected EventSource newEventSource(HttpServletRequest request)
        {
            String username = request.getUserPrincipal().getName();

            Log.debug("newEventSource " + username);

            if (username == null || username.equals(getUsername()) == false) return null;

            clientEventSource = new ClientEventSource();
            return clientEventSource;
        }

        final class ClientEventSource implements EventSource
        {
            private Set<EventSource.Emitter> emitters = new CopyOnWriteArraySet<>();
            private Emitter emitter;
            private volatile boolean closed = false;
            private ClientServlet servlet;

            @Override
            public void onOpen(Emitter emitter) throws IOException
            {
                this.emitter = emitter;
                emitters.add(emitter);
            }

            @Override
            public void onClose()
            {
                emitters.remove(this.emitter);

            }
        }

    }

    // -------------------------------------------------------
    //
    // OpenfireConfiguration
    //
    // -------------------------------------------------------

    public static class OpenfireConfiguration extends ConnectionConfiguration
    {
        protected OpenfireConfiguration(Builder builder) {
            super(builder);
        }

        public static Builder builder() {
            return new Builder();
        }

        public static final class Builder extends ConnectionConfiguration.Builder<Builder, OpenfireConfiguration> {

            private Builder() {
            }

            @Override
            public OpenfireConfiguration build() {
                return new OpenfireConfiguration(this);
            }

            @Override
            protected Builder getThis() {
                return this;
            }
        }
    }
}