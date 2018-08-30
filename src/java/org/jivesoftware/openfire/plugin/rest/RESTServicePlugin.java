/*
 * Copyright (C) 2005-2008 Jive Software. All rights reserved.
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

package org.jivesoftware.openfire.plugin.rest;

import java.io.File;
import java.io.FilenameFilter;
import java.util.*;
import java.net.*;
import java.util.concurrent.*;
import java.lang.reflect.*;
import java.security.Security;
import java.security.cert.Certificate;

import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;


import javax.servlet.DispatcherType;
import javax.ws.rs.core.Response;

import org.jivesoftware.openfire.container.Plugin;
import org.jivesoftware.openfire.container.PluginManager;
import org.jivesoftware.openfire.http.HttpBindManager;
import org.jivesoftware.openfire.auth.AuthFactory;
import org.jivesoftware.openfire.net.SASLAuthentication;
import org.jivesoftware.openfire.session.LocalClientSession;
import org.jivesoftware.openfire.net.VirtualConnection;
import org.jivesoftware.openfire.auth.UnauthorizedException;
import org.jivesoftware.openfire.auth.AuthToken;
import org.jivesoftware.openfire.auth.AuthFactory;
import org.jivesoftware.openfire.user.*;
import org.jivesoftware.openfire.event.*;
import org.jivesoftware.openfire.group.*;
import org.jivesoftware.openfire.muc.*;
import org.jivesoftware.openfire.session.*;
import org.jivesoftware.openfire.interceptor.*;
import org.jivesoftware.openfire.*;

import org.jivesoftware.openfire.plugin.rest.sasl.*;
import org.jivesoftware.openfire.plugin.rest.service.JerseyWrapper;
import org.jivesoftware.openfire.plugin.rest.controller.UserServiceController;
import org.jivesoftware.openfire.plugin.rest.entity.UserEntities;
import org.jivesoftware.openfire.plugin.rest.entity.UserEntity;
import org.jivesoftware.openfire.plugin.rest.entity.SystemProperties;
import org.jivesoftware.openfire.plugin.rest.entity.SystemProperty;
import org.jivesoftware.openfire.plugin.rest.exceptions.ExceptionType;
import org.jivesoftware.openfire.plugin.rest.exceptions.ServiceException;
import org.jivesoftware.openfire.plugin.rest.dao.PropertyDAO;
import org.jivesoftware.openfire.plugin.spark.*;

import org.jivesoftware.util.cache.Cache;
import org.jivesoftware.util.cache.CacheFactory;
import org.jivesoftware.util.JiveGlobals;
import org.jivesoftware.util.PropertyEventDispatcher;
import org.jivesoftware.util.PropertyEventListener;
import org.jivesoftware.util.StringUtils;

import org.eclipse.jetty.apache.jsp.JettyJasperInitializer;
import org.eclipse.jetty.plus.annotation.ContainerInitializer;
import org.eclipse.jetty.server.handler.ContextHandlerCollection;
import org.eclipse.jetty.servlet.*;
import org.eclipse.jetty.webapp.WebAppContext;
import org.eclipse.jetty.fcgi.server.proxy.*;
import org.eclipse.jetty.proxy.ProxyServlet;

import org.eclipse.jetty.util.security.*;
import org.eclipse.jetty.security.*;
import org.eclipse.jetty.security.authentication.*;

import org.apache.tomcat.InstanceManager;
import org.apache.tomcat.SimpleInstanceManager;
import org.jivesoftware.openfire.plugin.spark.BookmarkInterceptor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.jivesoftware.smack.OpenfireConnection;
import org.ifsoft.meet.*;
import org.xmpp.packet.*;
import org.dom4j.Element;
import net.sf.json.*;
import org.ifsoft.sms.Servlet;

import org.traderlynk.blast.MessageBlastService;
import org.jivesoftware.openfire.sip.sipaccount.SipAccount;

/**
 * The Class RESTServicePlugin.
 */
public class RESTServicePlugin implements Plugin, SessionEventListener, PropertyEventListener, PacketInterceptor {
    private static final Logger Log = LoggerFactory.getLogger(RESTServicePlugin.class);

    /** The Constant INSTANCE. */
    public static RESTServicePlugin INSTANCE = null;

    private static final String CUSTOM_AUTH_FILTER_PROPERTY_NAME = "plugin.ofchat.customAuthFilter";
    private static final UserManager userManager = XMPPServer.getInstance().getUserManager().getInstance();
    private static final String DOMAIN = XMPPServer.getInstance().getServerInfo().getXMPPDomain();

    /** The authentication secret. */
    private String secret;

    /** The permission secret. */
    private String permission;

    /** The allowed i ps. */
    private Collection<String> allowedIPs;

    /** The enabled. */
    private boolean enabled;
    private boolean smsEnabled;
    private boolean adhocEnabled;
    private boolean swaggerSecure;

    /** The http auth. */
    private String httpAuth;

    /** The custom authentication filter */
    private String customAuthFilterClassName;

    private BookmarkInterceptor bookmarkInterceptor;
    private ServletContextHandler context;
    private ServletContextHandler context2;
    private HashMap<String, ServletContextHandler> proxyContexts;

    private WebAppContext context3;
    private WebAppContext context4;
    private WebAppContext context5;
    private WebAppContext context6;
    private WebAppContext solo;
    public File pluginDirectory;

    private ExecutorService executor;
    private Plugin ofswitch = null;
    private AdminConnection adminConnection = null;

    public Cache<String, SipAccount> sipCache;
    public Cache<String, SipAccount> sipCache2;

    private Map<String, IQ> addhocCommands = new ConcurrentHashMap<String, IQ>();


    /**
     * Gets the single instance of RESTServicePlugin.
     *
     * @return single instance of RESTServicePlugin
     */
    public static RESTServicePlugin getInstance() {
        return INSTANCE;
    }

    /* (non-Javadoc)
     * @see org.jivesoftware.openfire.container.Plugin#initializePlugin(org.jivesoftware.openfire.container.PluginManager, java.io.File)
     */
    public void initializePlugin(PluginManager manager, File pluginDirectory)
    {
        INSTANCE = this;
        this.pluginDirectory = pluginDirectory;

        SessionEventDispatcher.addListener(this);

        secret = JiveGlobals.getProperty("plugin.restapi.secret", "");

        // If no secret key has been assigned, assign a random one.
        if ("".equals(secret)) {
            secret = StringUtils.randomString(16);
            setSecret(secret);
        }

        permission = JiveGlobals.getProperty("plugin.restapi.permission", "");

        // If no permission key has been assigned, assign a random one.
        if ("".equals(permission)) {
            permission = "Wa1l7M9NoGwcxxdX"; // default value in all web apps
            setPermission(permission);
        }

        Log.info("Initialize REST");

        // See if Custom authentication filter has been defined
        customAuthFilterClassName = JiveGlobals.getProperty("plugin.restapi.customAuthFilter", "");

        // See if the service is enabled or not.
        enabled = JiveGlobals.getBooleanProperty("plugin.restapi.enabled", false);
        smsEnabled = JiveGlobals.getBooleanProperty("ofchat.sms.enabled", false);
        adhocEnabled = JiveGlobals.getBooleanProperty("ofchat.adhoc.commands.enabled", false);
        swaggerSecure = JiveGlobals.getBooleanProperty("ofchat.swagger.secure", false);

        // See if the HTTP Basic Auth is enabled or not.
        httpAuth = JiveGlobals.getProperty("plugin.restapi.httpAuth", "basic");

        // Get the list of IP addresses that can use this service. An empty list
        // means that this filter is disabled.
        allowedIPs = StringUtils.stringToCollection(JiveGlobals.getProperty("plugin.restapi.allowedIPs", ""));

        // Listen to system property events
        PropertyEventDispatcher.addListener(this);

        // start REST service on http-bind port
        context = new ServletContextHandler(null, "/rest", ServletContextHandler.SESSIONS);
        context.setClassLoader(this.getClass().getClassLoader());
        context.addServlet(new ServletHolder(new JerseyWrapper()), "/api/*");

        // Ensure the JSP engine is initialized correctly (in order to be
        // able to cope with Tomcat/Jasper precompiled JSPs).

        final List<ContainerInitializer> initializers = new ArrayList<>();
        initializers.add(new ContainerInitializer(new JettyJasperInitializer(), null));
        context.setAttribute("org.eclipse.jetty.containerInitializers", initializers);
        context.setAttribute(InstanceManager.class.getName(), new SimpleInstanceManager());
        HttpBindManager.getInstance().addJettyHandler(context);

        Log.info("Initialize SSE");

        context2 = new ServletContextHandler(null, "/sse", ServletContextHandler.SESSIONS);
        context2.setClassLoader(this.getClass().getClassLoader());

        SecurityHandler securityHandler2 = basicAuth("ofchat");

        if (securityHandler2 != null) context2.setSecurityHandler(securityHandler2);

        final List<ContainerInitializer> initializers2 = new ArrayList<>();
        initializers2.add(new ContainerInitializer(new JettyJasperInitializer(), null));
        context2.setAttribute("org.eclipse.jetty.containerInitializers", initializers2);
        context2.setAttribute(InstanceManager.class.getName(), new SimpleInstanceManager());
        HttpBindManager.getInstance().addJettyHandler(context2);


        Log.info("Initialize Swagger WebService ");

        context3 = new WebAppContext(null, pluginDirectory.getPath() + "/classes/swagger", "/swagger");

/*
        ServletHolder fcgiServlet = context3.addServlet(FastCGIProxyServlet.class, "*.php");
        fcgiServlet.setInitParameter(FastCGIProxyServlet.SCRIPT_ROOT_INIT_PARAM, pluginDirectory.getPath() + "/classes");
        fcgiServlet.setInitParameter("proxyTo", "http://localhost:9123");
        fcgiServlet.setInitParameter("prefix", "/");
        fcgiServlet.setInitParameter("dirAllowed", "false");
        fcgiServlet.setInitParameter(FastCGIProxyServlet.SCRIPT_PATTERN_INIT_PARAM, "(.+?\\.php)");
*/

        context3.setClassLoader(this.getClass().getClassLoader());
        final List<ContainerInitializer> initializers3 = new ArrayList<>();
        initializers3.add(new ContainerInitializer(new JettyJasperInitializer(), null));
        context3.setAttribute("org.eclipse.jetty.containerInitializers", initializers3);
        context3.setAttribute(InstanceManager.class.getName(), new SimpleInstanceManager());
        context3.setWelcomeFiles(new String[]{"index.html"});
        HttpBindManager.getInstance().addJettyHandler(context3);


        Log.info("Initialize Meet WebService ");

        context4 = new WebAppContext(null, pluginDirectory.getPath() + "/classes/jitsi-meet", "/meet");
        context4.setClassLoader(this.getClass().getClassLoader());

        if ( JiveGlobals.getBooleanProperty("ofmeet.security.enabled", true ) )
        {
            Log.info("Initialize Meet WebService security");
            SecurityHandler securityHandler4 = basicAuth("ofchat");
            if (securityHandler4 != null) context4.setSecurityHandler(securityHandler4);
        }

        final List<ContainerInitializer> initializers4 = new ArrayList<>();
        initializers4.add(new ContainerInitializer(new JettyJasperInitializer(), null));
        context4.setAttribute("org.eclipse.jetty.containerInitializers", initializers4);
        context4.setAttribute(InstanceManager.class.getName(), new SimpleInstanceManager());
        context4.setWelcomeFiles(new String[]{"index.jsp"});
        context4.addFilter( JitsiMeetRedirectFilter.class, "/*", EnumSet.of( DispatcherType.REQUEST ) );
        HttpBindManager.getInstance().addJettyHandler(context4);

        Log.info("Initialize Dashboard WebService ");

        context5 = new WebAppContext(null, pluginDirectory.getPath() + "/classes/dashboard", "/dashboard");
        context5.setClassLoader(this.getClass().getClassLoader());

        if ( JiveGlobals.getBooleanProperty("ofmeet.security.enabled", true ) )
        {
            Log.info("Initialize Dashboard WebService security");
            SecurityHandler securityHandler5 = basicAuth("ofchat");
            if (securityHandler5 != null) context5.setSecurityHandler(securityHandler5);
        }

        final List<ContainerInitializer> initializers5 = new ArrayList<>();
        initializers5.add(new ContainerInitializer(new JettyJasperInitializer(), null));
        context5.setAttribute("org.eclipse.jetty.containerInitializers", initializers5);
        context5.setAttribute(InstanceManager.class.getName(), new SimpleInstanceManager());
        context5.setWelcomeFiles(new String[]{"index.jsp"});
        HttpBindManager.getInstance().addJettyHandler(context5);

        Log.info("Initialize Unsecure Apps WebService ");

        context6 = new WebAppContext(null, pluginDirectory.getPath() + "/classes/apps", "/apps");
        context6.setClassLoader(this.getClass().getClassLoader());

        final List<ContainerInitializer> initializers6 = new ArrayList<>();
        initializers6.add(new ContainerInitializer(new JettyJasperInitializer(), null));
        context6.setAttribute("org.eclipse.jetty.containerInitializers", initializers6);
        context6.setAttribute(InstanceManager.class.getName(), new SimpleInstanceManager());
        context6.setWelcomeFiles(new String[]{"index.jsp"});
        HttpBindManager.getInstance().addJettyHandler(context6);

        proxyContexts = new HashMap<String, ServletContextHandler>();

        List<String> properties = JiveGlobals.getPropertyNames();
        List<String> deletes = new ArrayList<String>();

        for (String propertyName : properties) {

            if (propertyName.indexOf("ofchat.reverse.proxy.") == 0)
            {
                String appName = propertyName.substring(21);
                String url = JiveGlobals.getProperty(propertyName);

                Log.info("Initialize Reverse proxy " + appName + "\n" + url);

                ServletContextHandler proxyContext = new ServletContextHandler(null, "/" + appName, ServletContextHandler.SESSIONS);
                ServletHolder proxyServlet = new ServletHolder(ProxyServlet.Transparent.class);
                proxyServlet.setInitParameter("proxyTo", url);
                proxyServlet.setInitParameter("prefix", "/");
                proxyContext.addServlet(proxyServlet, "/*");

                HttpBindManager.getInstance().addJettyHandler(proxyContext);
                proxyContexts.put(propertyName, proxyContext);
            }
        }

        Log.info("Initialize Email Listener");
        EmailListener.getInstance().start();

        Log.info("Initialize preffered property default values");
        JiveGlobals.setProperty("route.all-resources", "true");     // send chat messages to all resources
        JiveGlobals.setProperty("ofmeet.buttons.implemented", "microphone, camera, desktop, invite, fullscreen, fodeviceselection, hangup, profile, dialout, addtocall, contacts, info, chat, recording, sharedvideo, settings, raisehand, videoquality, filmstrip");
        JiveGlobals.setProperty("ofmeet.buttons.enabled", "microphone, camera, desktop, invite, fullscreen, fodeviceselection, hangup, profile, dialout, addtocall, contacts, info, chat, recording, sharedvideo, settings, raisehand, videoquality, filmstrip");
        JiveGlobals.setProperty("org.jitsi.videobridge.ofmeet.inviteOptions", "invite, dialout, addtocall");
        JiveGlobals.setProperty("org.jitsi.videobridge.ofmeet.chrome.extension.id", "fmgnibblgekonbgjhkjicekgacgoagmm");
        JiveGlobals.setProperty("org.jitsi.videobridge.ofmeet.min.chrome.ext.ver", "0.0.1");
        JiveGlobals.setProperty("uport.clientid.etherlynk.2ofdeAidaU2mjJ5X8r1CgH2RdPb9qKVS9pc", "1b561603d69de7091fa9cee632741f7f313b4dd39bc328d38dc514bbb5f184e3");
        JiveGlobals.setProperty("uport.clientid.pade.2p1psGHt9J5NBdPDQejSVhpsECXLxLaVQSo", "46445273c02e4c0594ef6a441ecbcd327f0f78ba58b3139e027f0b23c199ea5f");

        try
        {
            Security.addProvider( new OfChatSaslProvider() );
            SASLAuthentication.addSupportedMechanism( OfChatSaslServer.MECHANISM_NAME );
            //loadSolo();
        }
        catch ( Exception ex )
        {
            Log.error( "An exception occurred", ex );
        }

        Log.info("Initialize Bookmark Interceptor");

        bookmarkInterceptor = new BookmarkInterceptor();
        bookmarkInterceptor.start();

        Log.info("Initialize MessageBlastService service");

        MessageBlastService.start();

        executor = Executors.newCachedThreadPool();

        executor.submit(new Callable<Boolean>()
        {
            public Boolean call() throws Exception
            {
                Log.info("Bootstrap auto-join conferences");

                UserEntities userEntities = UserServiceController.getInstance().getUserEntitiesByProperty("webpush.subscribe.%", null);
                boolean isBookmarksAvailable = XMPPServer.getInstance().getPluginManager().getPlugin("bookmarks") != null;
                Collection<Bookmark> bookmarks = null;

                if (isBookmarksAvailable)
                {
                    bookmarks = BookmarkManager.getBookmarks();
                }

                for (UserEntity user : userEntities.getUsers())
                {
                    String username = user.getUsername();

                    try {
                        OpenfireConnection connection = OpenfireConnection.createConnection(username, null, false);

                        if (connection != null)
                        {
                            Log.info("Auto-login for user " + username + " sucessfull");
                            connection.autoStarted = true;

                            if (bookmarks != null)
                            {
                                for (Bookmark bookmark : bookmarks)
                                {
                                    boolean addBookmarkForUser = bookmark.isGlobalBookmark() || isBookmarkForJID(username, bookmark);

                                    if (addBookmarkForUser)
                                    {
                                        if (bookmark.getType() == Bookmark.Type.group_chat)
                                        {
                                            connection.joinRoom(bookmark.getValue(), username);
                                        }
                                    }
                                }
                            }

                        }

                    } catch (Exception e) {
                        Log.warn("Auto-login for user " + username + " failed");
                    }
                }
                return true;
            }
        });

        Log.info("Create recordings folder");
        checkRecordingsFolder();

        if ( adhocEnabled )
        {
            Log.info("Create admin session for ad-hoc commands");
            adminConnection = new AdminConnection();
        }

        Log.info("Create SIP cachee");

        sipCache = CacheFactory.createLocalCache("SIP Account By Extension");
        sipCache.setMaxCacheSize(-1);
        sipCache.setMaxLifetime(3600 * 1000);

        sipCache2 = CacheFactory.createLocalCache("SIP Account By Username");
        sipCache2.setMaxCacheSize(-1);
        sipCache2.setMaxLifetime(3600 * 1000);

        if ( smsEnabled )
        {
            Log.info("Setup SMS message interceptor");
            InterceptorManager.getInstance().addInterceptor(this);
        }
    }

    /* (non-Javadoc)
     * @see org.jivesoftware.openfire.container.Plugin#destroyPlugin()
     */
    public void destroyPlugin() {

        if (adminConnection != null) adminConnection.close();

        PropertyEventDispatcher.removeListener(this);

        if ( bookmarkInterceptor != null )
        {
            bookmarkInterceptor.stop();
            bookmarkInterceptor = null;
        }

        MessageBlastService.stop();

        HttpBindManager.getInstance().removeJettyHandler(context);
        HttpBindManager.getInstance().removeJettyHandler(context2);
        HttpBindManager.getInstance().removeJettyHandler(context3);
        HttpBindManager.getInstance().removeJettyHandler(context4);
        HttpBindManager.getInstance().removeJettyHandler(context5);
        HttpBindManager.getInstance().removeJettyHandler(context6);

        for (String key : proxyContexts.keySet())
        {
            HttpBindManager.getInstance().removeJettyHandler(proxyContexts.get(key));
        }

        executor.shutdown();
        EmailListener.getInstance().stop();
        SessionEventDispatcher.removeListener(this);

        try {
            SASLAuthentication.removeSupportedMechanism( OfChatSaslServer.MECHANISM_NAME );
            Security.removeProvider( OfChatSaslProvider.NAME );

            //unloadSolo();
        } catch (Exception e) {}

        InterceptorManager.getInstance().removeInterceptor(this);
    }

    /**
     * Gets the system properties.
     *
     * @return the system properties
     */
    public SystemProperties getSystemProperties() {
        SystemProperties systemProperties = new SystemProperties();
        List<SystemProperty> propertiesList = new ArrayList<SystemProperty>();

        for(String propertyKey : JiveGlobals.getPropertyNames()) {
            String propertyValue = JiveGlobals.getProperty(propertyKey);
            propertiesList.add(new SystemProperty(propertyKey, propertyValue));
        }
        systemProperties.setProperties(propertiesList);
        return systemProperties;

    }

    /**
     * Gets the system property.
     *
     * @param propertyKey the property key
     * @return the system property
     * @throws ServiceException the service exception
     */
    public SystemProperty getSystemProperty(String propertyKey) throws ServiceException {
        String propertyValue = JiveGlobals.getProperty(propertyKey);
        if(propertyValue != null) {
        return new SystemProperty(propertyKey, propertyValue);
        } else {
            throw new ServiceException("Could not find property", propertyKey, ExceptionType.PROPERTY_NOT_FOUND,
                    Response.Status.NOT_FOUND);
        }
    }

    /**
     * Creates the system property.
     *
     * @param systemProperty the system property
     */
    public void createSystemProperty(SystemProperty systemProperty) {
        JiveGlobals.setProperty(systemProperty.getKey(), systemProperty.getValue());
    }

    /**
     * Delete system property.
     *
     * @param propertyKey the property key
     * @throws ServiceException the service exception
     */
    public void deleteSystemProperty(String propertyKey) throws ServiceException {
        if(JiveGlobals.getProperty(propertyKey) != null) {
            JiveGlobals.deleteProperty(propertyKey);
        } else {
            throw new ServiceException("Could not find property", propertyKey, ExceptionType.PROPERTY_NOT_FOUND,
                    Response.Status.NOT_FOUND);
        }
    }

    /**
     * Update system property.
     *
     * @param propertyKey the property key
     * @param systemProperty the system property
     * @throws ServiceException the service exception
     */
    public void updateSystemProperty(String propertyKey, SystemProperty systemProperty) throws ServiceException {
        if(JiveGlobals.getProperty(propertyKey) != null) {
            if(systemProperty.getKey().equals(propertyKey)) {
                JiveGlobals.setProperty(propertyKey, systemProperty.getValue());
            } else {
                throw new ServiceException("Path property name and entity property name doesn't match", propertyKey, ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION,
                        Response.Status.BAD_REQUEST);
            }
        } else {
            throw new ServiceException("Could not find property for update", systemProperty.getKey(), ExceptionType.PROPERTY_NOT_FOUND,
                    Response.Status.NOT_FOUND);
        }
    }


    /**
     * Returns the loading status message.
     *
     * @return the loading status message.
     */
    public String getLoadingStatusMessage() {
        return JerseyWrapper.getLoadingStatusMessage();
    }

    /**
     * Reloads the Jersey wrapper.
     */
    public String loadAuthenticationFilter(String customAuthFilterClassName) {
        return JerseyWrapper.tryLoadingAuthenticationFilter(customAuthFilterClassName);
    }

    /**
     * Returns the secret key that only valid requests should know.
     *
     * @return the secret key.
     */
    public String getSecret() {
        return secret;
    }

    /**
     * Sets the secret key that grants permission to use the userservice.
     *
     * @param secret
     *            the secret key.
     */
    public void setSecret(String secret) {
        JiveGlobals.setProperty("plugin.restapi.secret", secret);
        this.secret = secret;
    }

    /**
     * Returns the permission key that only valid requests should know.
     *
     * @return the permission key.
     */
    public String getPermission() {
        return permission;
    }

    /**
     * Sets the permission key that grants permission to use the userservice.
     *
     * @param permission
     *            the permission key.
     */
    public void setPermission(String permission) {
        JiveGlobals.setProperty("plugin.restapi.permission", permission);
        this.permission = permission;
    }

    /**
     * Returns the custom authentication filter class name used in place of the basic ones to grant permission to use the Rest services.
     *
     * @return custom authentication filter class name .
     */
    public String getCustomAuthFilterClassName() {
        return customAuthFilterClassName;
    }

    /**
     * Sets the customAuthFIlterClassName used to grant permission to use the Rest services.
     *
     * @param customAuthFilterClassName
     *            custom authentication filter class name.
     */
    public void setCustomAuthFiIterClassName(String customAuthFilterClassName) {
        JiveGlobals.setProperty(CUSTOM_AUTH_FILTER_PROPERTY_NAME, customAuthFilterClassName);
        this.customAuthFilterClassName = customAuthFilterClassName;
    }

    /**
     * Gets the allowed i ps.
     *
     * @return the allowed i ps
     */
    public Collection<String> getAllowedIPs() {
        return allowedIPs;
    }

    /**
     * Sets the allowed i ps.
     *
     * @param allowedIPs the new allowed i ps
     */
    public void setAllowedIPs(Collection<String> allowedIPs) {
        JiveGlobals.setProperty("plugin.restapi.allowedIPs", StringUtils.collectionToString(allowedIPs));
        this.allowedIPs = allowedIPs;
    }

    /**
     * Returns true if the user service is enabled. If not enabled, it will not
     * accept requests to create new accounts.
     *
     * @return true if the user service is enabled.
     */
    public boolean isEnabled() {
        return enabled;
    }

    /**
     * Enables or disables the user service. If not enabled, it will not accept
     * requests to create new accounts.
     *
     * @param enabled
     *            true if the user service should be enabled.
     */
    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
        JiveGlobals.setProperty("plugin.restapi.enabled", enabled ? "true" : "false");
    }

    public boolean isSmsEnabled() {
        return smsEnabled;
    }

    public void setSmsEnabled(boolean smsEnabled) {
        this.smsEnabled = smsEnabled;
        JiveGlobals.setProperty("ofchat.sms.enabled", smsEnabled ? "true" : "false");
    }

    public void setAdhocEnabled(boolean adhocEnabled) {
        this.adhocEnabled = adhocEnabled;
        JiveGlobals.setProperty("ofchat.adhoc.commands.enabled", adhocEnabled ? "true" : "false");
    }

    public boolean isAdhocEnabled() {
        return adhocEnabled;
    }

    public void setSwaggerSecure(boolean swaggerSecure) {
        this.swaggerSecure = swaggerSecure;
        JiveGlobals.setProperty("ofchat.swagger.secure", swaggerSecure ? "true" : "false");
    }

    public boolean isSwaggerSecure() {
        return swaggerSecure;
    }


    /**
     * Gets the http authentication mechanism.
     *
     * @return the http authentication mechanism
     */
    public String getHttpAuth() {
        return httpAuth;
    }

    /**
     * Sets the http auth.
     *
     * @param httpAuth the new http auth
     */
    public void setHttpAuth(String httpAuth) {
        this.httpAuth = httpAuth;
        JiveGlobals.setProperty("plugin.restapi.httpAuth", httpAuth);
    }

    /* (non-Javadoc)
     * @see org.jivesoftware.util.PropertyEventListener#propertySet(java.lang.String, java.util.Map)
     */
    public void propertySet(String property, Map<String, Object> params) {
        if (property.equals("plugin.restapi.secret")) {
            this.secret = (String) params.get("value");
        } else if (property.equals("plugin.restapi.permission")) {
            this.permission = (String) params.get("value");
        } else if (property.equals("plugin.restapi.enabled")) {
            this.enabled = Boolean.parseBoolean((String) params.get("value"));
        } else if (property.equals("plugin.restapi.allowedIPs")) {
            this.allowedIPs = StringUtils.stringToCollection((String) params.get("value"));
        } else if (property.equals("plugin.restapi.httpAuth")) {
            this.httpAuth = (String) params.get("value");
        } else if(property.equals(CUSTOM_AUTH_FILTER_PROPERTY_NAME)) {
            this.customAuthFilterClassName = (String) params.get("value");
        }
    }

    /* (non-Javadoc)
     * @see org.jivesoftware.util.PropertyEventListener#propertyDeleted(java.lang.String, java.util.Map)
     */
    public void propertyDeleted(String property, Map<String, Object> params) {
        if (property.equals("plugin.restapi.secret")) {
            this.secret = "";
        } else if (property.equals("plugin.restapi.permission")) {
            this.permission = "";
        } else if (property.equals("plugin.restapi.enabled")) {
            this.enabled = false;
        } else if (property.equals("plugin.restapi.allowedIPs")) {
            this.allowedIPs = Collections.emptyList();
        } else if (property.equals("plugin.restapi.httpAuth")) {
            this.httpAuth = "basic";
        } else if(property.equals(CUSTOM_AUTH_FILTER_PROPERTY_NAME)) {
            this.customAuthFilterClassName = null;
        }
    }

    /* (non-Javadoc)
     * @see org.jivesoftware.util.PropertyEventListener#xmlPropertySet(java.lang.String, java.util.Map)
     */
    public void xmlPropertySet(String property, Map<String, Object> params) {
        // Do nothing
    }

    /* (non-Javadoc)
     * @see org.jivesoftware.util.PropertyEventListener#xmlPropertyDeleted(java.lang.String, java.util.Map)
     */
    public void xmlPropertyDeleted(String property, Map<String, Object> params) {
        // Do nothing
    }

    // add/remove SSE user endpoints

    public void addServlet(ServletHolder holder, String path)
    {
        Log.info("addServlet " + holder.getName());

        try {
            context2.addServlet(holder, path);
        } catch (Exception e) {

        }
    }

    public void removeServlets(ServletHolder deleteHolder)
    {
       Log.info("removeServlets " + deleteHolder.getName());

       try {
           ServletHandler handler = context2.getServletHandler();
           List<ServletHolder> servlets = new ArrayList<ServletHolder>();
           Set<String> names = new HashSet<String>();

           for( ServletHolder holder : handler.getServlets() )
           {
               try {
                  if(deleteHolder.getName().equals(holder.getName()))
                  {
                      names.add(holder.getName());
                  }
                  else /* We keep it */
                  {
                      servlets.add(holder);
                  }
              } catch (Exception e) {
                  servlets.add(holder);
              }
           }

           List<ServletMapping> mappings = new ArrayList<ServletMapping>();

           for( ServletMapping mapping : handler.getServletMappings() )
           {
              /* Only keep the mappings that didn't point to one of the servlets we removed */

              if(!names.contains(mapping.getServletName()))
              {
                  mappings.add(mapping);
              }
           }

           /* Set the new configuration for the mappings and the servlets */

           handler.setServletMappings( mappings.toArray(new ServletMapping[0]) );
           handler.setServlets( servlets.toArray(new ServletHolder[0]) );

        } catch (Exception e) {

        }
    }

    private static final SecurityHandler basicAuth(String realm) {

        OpenfireLoginService l = new OpenfireLoginService();
        l.setName(realm);

        Constraint constraint = new Constraint();
        constraint.setName(Constraint.__BASIC_AUTH);
        constraint.setRoles(new String[]{"ofchat", "blog-owner", "blog-contributor", "solo-admin"});
        constraint.setAuthenticate(true);

        ConstraintMapping cm = new ConstraintMapping();
        cm.setConstraint(constraint);
        cm.setPathSpec("/*");

        ConstraintSecurityHandler csh = new ConstraintSecurityHandler();
        csh.setAuthenticator(new BasicAuthenticator());
        csh.setRealmName(realm);
        csh.addConstraintMapping(cm);
        csh.setLoginService(l);

        return csh;
    }

    private boolean isBookmarkForJID(String username, Bookmark bookmark) {

        if (username == null || username.equals("null")) return false;

        if (bookmark.getUsers().contains(username)) {
            return true;
        }

        Collection<String> groups = bookmark.getGroups();

        if (groups != null && !groups.isEmpty()) {
            GroupManager groupManager = GroupManager.getInstance();

            for (String groupName : groups) {
                try {
                    Group group = groupManager.getGroup(groupName);

                    if (group.isUser(username)) {
                        return true;
                    }
                }
                catch (GroupNotFoundException e) {
                    Log.debug(e.getMessage(), e);
                }
            }
        }
        return false;
    }

    public String getIpAddress()
    {
        String ourHostname = XMPPServer.getInstance().getServerInfo().getHostname();
        String ourIpAddress = ourHostname;

        try {
            ourIpAddress = InetAddress.getByName(ourHostname).getHostAddress();
        } catch (Exception e) {

        }

        return ourIpAddress;
    }

    public void eventReceived( String eventName, Map<String, String> headers )
    {
        Log.debug("FreeSWITCH eventReceived " + eventName + " " + headers);

        if (eventName.equals("CHANNEL_CALLSTATE"))
        {
            MeetController.getInstance().callStateEvent(headers);
        }
    }

    public void conferenceEventJoin(String uniqueId, String confName, int confSize, Map<String, String> headers)
    {
        Log.debug("FreeSWITCH conferenceEventJoin " + confName + " " + headers);
        MeetController.getInstance().conferenceEventJoin(headers, confName, confSize);
    }

    public void conferenceEventLeave(String uniqueId, String confName, int confSize, Map<String, String> headers)
    {
        Log.debug("FreeSWITCH conferenceEventLeave " + confName + " " + headers);
        MeetController.getInstance().conferenceEventLeave(headers, confName, confSize);
    }

    public Object sendAsyncFWCommand(String command)
    {
        Object response = null;

        if (ofswitch == null) ofswitch = (Plugin) XMPPServer.getInstance().getPluginManager().getPlugin("ofswitch");

        try {
            Method method = ofswitch.getClass().getMethod("sendAsyncFWCommand", new Class[] {String.class});
            response = method.invoke(ofswitch, new Object[] {command});
        } catch (Exception e) {
            Log.error("reflect error " + e);
        }
        return response;
    }

    public List<String> sendFWCommand(String command)
    {
        List<String> lines = null;

        if (ofswitch == null) ofswitch = (Plugin) XMPPServer.getInstance().getPluginManager().getPlugin("ofswitch");

        try {
            Method method = ofswitch.getClass().getMethod("sendFWCommand", new Class[] {String.class});
            Object response = method.invoke(ofswitch, new Object[] {command});

            if (response != null)
            {
                Method getBodyLines = response.getClass().getMethod("getBodyLines", new Class[] {});
                lines = (List) getBodyLines.invoke(response, new Object[] {});
            }

        } catch (Exception e) {
            Log.error("reflect error " + e);
        }
        return lines;
    }


    //-------------------------------------------------------
    //
    //  PacketInterceptor for SMS
    //
    //-------------------------------------------------------

    public void interceptPacket(Packet packet, org.jivesoftware.openfire.session.Session session, boolean incoming, boolean processed) throws PacketRejectedException
    {
        // Ignore any packets that haven't already been processed by interceptors.

        if (!processed) {
            return;
        }

        if (packet instanceof Message)
        {
            if (!incoming) {
                return;
            }

            Message message = (Message) packet;
            final JID fromJID = message.getFrom();
            final JID toJID = message.getTo();

            if (message.getBody() != null && Message.Type.chat == message.getType())
            {
                if (fromJID.getNode() != null && toJID.getNode() != null)
                {
                    try {
                        String from = fromJID.getNode().toString();
                        String to = toJID.getNode().toString();

                        User fromUser = null;

                        try {fromUser = userManager.getUser(from);} catch (Exception e1) {}

                        if (fromUser != null)
                        {
                            String smsFrom = fromUser.getProperties().get("sms_out_number");
                            String smsTo = null;

                            if (to.startsWith("sms-"))
                            {
                                smsTo = to.substring(4);

                            } else {
                                try {
                                    User toUser = userManager.getUser(to);
                                    smsTo = toUser.getProperties().get("sms_in_number");
                                } catch (Exception e1) {}
                            }

                            if (smsTo != null && smsFrom != null)
                            {
                                String body = message.getBody();

                                try {
                                    JSONObject jsonBody = new JSONObject(body);

                                    if (jsonBody.has("body"))
                                    {
                                        body = jsonBody.getString("body");
                                    }
                                } catch (Exception e1) {}

                                Servlet.smsOutgoing(smsTo, smsFrom, body);
                            }
                        }

                    } catch (Exception e) {
                        Log.error("interceptPacket", e);
                    }
                }
            }
        }
    }

    public static void smsIncoming(JSONObject sms)
    {
        /*  nexmo sms messages

            https://desktop-545pc5b:7443/apps/sms?to=12817649550&text=hello&msisdn=447555129550&type=text&keyword=HELLO

            messageId: 0B00000006214E86
            to: 12817649550
            text: Helli
            msisdn: 447555129550
            type: text
            keyword: HELLI
            message-timestamp: 2018-08-24 13:09:53

            network-code: 23415
            price: 0.03330000
            messageId: 0C000000DD800584
            scts: 1808241943
            to: 12817649550
            err-code: 0
            msisdn: 447555129550
            message-timestamp: 2018-08-24 19:43:55
            status: accepted

            network-code: 23415
            price: 0.03330000
            messageId: 0C000000DD800584
            scts: 1808241944
            to: 12817649550
            err-code: 0
            msisdn: 447555129550
            message-timestamp: 2018-08-24 19:44:00
            status: delivered

        */

        if (sms.has("text") && sms.has("keyword") && sms.has("msisdn") && sms.has("to"))
        {
            try {
                List<String> fromUsers = PropertyDAO.getUsernameByProperty("sms_in_number", sms.getString("msisdn"));
                List<String> toUsers = PropertyDAO.getUsernameByProperty("sms_out_number", sms.getString("to"));

                if (fromUsers.size() > 1 || toUsers.size() > 1) Log.warn("smsIncoming - multiple users with " + sms.getString("msisdn") + " or " + sms.getString("to"));

                if (toUsers.size() > 0)
                {
                    String toJid = toUsers.get(0) + "@" + DOMAIN;
                    String fromJid = null;

                    if (fromUsers.size() > 0)
                    {
                        fromJid = fromUsers.get(0) + "@" + DOMAIN;
                    } else {
                        String fromSMS = "sms-" + sms.getString("msisdn");
                        fromJid = fromSMS + "@" + DOMAIN;
                        OpenfireConnection.createConnection(fromSMS, null, true);
                    }

                    Message message = new Message();
                    message.setType(Message.Type.chat);
                    message.setFrom(fromJid);
                    message.setTo(toJid);
                    message.setBody(sms.getString("text"));

                    XMPPServer.getInstance().getMessageRouter().route(message);
                }
            } catch (Exception e) {
                Log.error("smsIncoming", e);
            }
        }
    }

    // -------------------------------------------------------
    //
    //  SessionEventListener
    //
    // -------------------------------------------------------

    public void anonymousSessionCreated(Session session)
    {

    }

    public void anonymousSessionDestroyed(Session session)
    {
        exitAllRooms(session.getAddress());
    }

    public void resourceBound(Session session)
    {

    }

    public void sessionCreated(Session session)
    {

    }

    public void sessionDestroyed(Session session)
    {
        exitAllRooms(session.getAddress());
    }

    public void exitAllRooms(JID jid)
    {
        boolean bruteForceLogoff = JiveGlobals.getBooleanProperty("ofmeet.bruteforce.logoff", true);

        if (bruteForceLogoff)
        {
            Log.info("logoff - " + jid);

            String userJid = jid.toBareJID();

            for ( MultiUserChatService mucService : XMPPServer.getInstance().getMultiUserChatManager().getMultiUserChatServices() )
            {
                List<MUCRoom> rooms = mucService.getChatRooms();

                for (MUCRoom chatRoom : rooms)
                {
                    try {
                        Log.info("forcing " + userJid + " out of " + chatRoom.getName());

                        chatRoom.addNone(new JID(userJid), chatRoom.getRole());

                        chatRoom.kickOccupant( jid, chatRoom.getRole().getUserAddress(), null, "" );
                        chatRoom.kickOccupant( new JID(userJid), chatRoom.getRole().getUserAddress(), null, "" );
                    }
                    catch (Exception e) {
                        Log.error("forcing " + userJid + " out of " + chatRoom.getName(), e);
                    }
                }
            }
        }
    }

    // -------------------------------------------------------
    //
    //
    //
    // -------------------------------------------------------

    protected void loadSolo() throws Exception
    {
        Log.info( "Initializing solo application" );
        Log.debug( "Identify the name of the solo archive file" );

        final File libs = new File(pluginDirectory.getPath() + File.separator + "classes");

        final File[] matchingFiles = libs.listFiles( new FilenameFilter()
        {
            public boolean accept(File dir, String name)
            {
                return name.toLowerCase().startsWith("solo") && name.toLowerCase().endsWith(".war");
            }
        });

        final File soloApp;
        switch ( matchingFiles.length )
        {
            case 0:
                Log.error( "Unable to find public web application archive for solo!" );
                return;

            default:
                Log.warn( "Found more than one public web application archive for solo. Using an arbitrary one." );
                // intended fall-through.

            case 1:
                soloApp = matchingFiles[0];
                Log.debug( "Using this archive: {}", soloApp );
        }

        Log.debug( "Creating new WebAppContext for solo." );

        solo = new WebAppContext();
        solo.setWar( soloApp.getAbsolutePath() );

        String blogName = JiveGlobals.getProperty("solo.blog.name", "blog");
        solo.setContextPath( "/" + blogName);

        final List<ContainerInitializer> initializers = new ArrayList<>();
        initializers.add(new ContainerInitializer(new JettyJasperInitializer(), null));
        solo.setAttribute("org.eclipse.jetty.containerInitializers", initializers);
        solo.setAttribute(InstanceManager.class.getName(), new SimpleInstanceManager());

        HttpBindManager.getInstance().addJettyHandler( solo );

        Log.debug( "Initialized solo application" );
    }

    public void unloadSolo() throws Exception
    {
        if ( solo != null )
        {
            try
            {
                HttpBindManager.getInstance().removeJettyHandler( solo );
                solo.destroy();
            }
            finally
            {
                solo = null;
            }
        }
    }

    private void checkRecordingsFolder()
    {
        String ofmeetHome = JiveGlobals.getHomeDirectory() + File.separator + "resources" + File.separator + "spank" + File.separator + "ofmeet-cdn";

        try
        {
            File ofmeetFolderPath = new File(ofmeetHome);

            if(!ofmeetFolderPath.exists())
            {
                ofmeetFolderPath.mkdirs();

            }

            List<String> lines = Arrays.asList("Move on, nothing here....");
            Path file = Paths.get(ofmeetHome + File.separator + "index.html");
            Files.write(file, lines, Charset.forName("UTF-8"));

            File recordingsHome = new File(ofmeetHome + File.separator + "recordings");

            if(!recordingsHome.exists())
            {
                recordingsHome.mkdirs();

            }

            lines = Arrays.asList("Move on, nothing here....");
            file = Paths.get(recordingsHome + File.separator + "index.html");
            Files.write(file, lines, Charset.forName("UTF-8"));
        }
        catch (Exception e)
        {
            Log.error("checkDownloadFolder", e);
        }
    }

    public void refreshClientCerts()
    {
        executor.submit(new Callable<Boolean>()
        {
            public Boolean call() throws Exception
            {
                Log.info("Refreshing client certificates");

                String c2sTrustStoreLocation = JiveGlobals.getHomeDirectory() + File.separator + "resources" + File.separator + "security" + File.separator;
                String certificatesHome = JiveGlobals.getHomeDirectory() + File.separator + "certificates";

                try {
                    File[] files = new File(certificatesHome).listFiles();

                    for (File file : files)
                    {
                        if (file.isDirectory())
                        {
                            String alias = file.getName();
                            String aliasHome = certificatesHome + File.separator + alias;

                            Log.info("Client certificate " + alias);

                            String command3 = "-delete -keystore " + c2sTrustStoreLocation + "truststore -storepass changeit -alias " + alias;
                            System.err.println(command3);
                            sun.security.tools.keytool.Main.main(command3.split(" "));

                            String command4 = "-delete -keystore " + c2sTrustStoreLocation + "client.truststore -storepass changeit -alias " + alias;
                            System.err.println(command4);
                            sun.security.tools.keytool.Main.main(command4.split(" "));

                            String command5 = "-importcert -keystore " + c2sTrustStoreLocation + "truststore -storepass changeit -alias " + alias + " -file " + aliasHome + File.separator + alias + ".crt -noprompt -trustcacerts";
                            System.err.println(command5);
                            sun.security.tools.keytool.Main.main(command5.split(" "));

                            String command6 = "-importcert -keystore " + c2sTrustStoreLocation + "client.truststore -storepass changeit -alias " + alias + " -file " + aliasHome + File.separator + alias + ".crt -noprompt -trustcacerts";
                            System.err.println(command6);
                            sun.security.tools.keytool.Main.main(command6.split(" "));
                        }
                    }
                    return true;

                } catch (Exception e) {
                    Log.error("refreshClientCerts", e);
                    return false;
                }
            }
        });
    }

/*
    <iq type='get'
        to='workgroup.peebx.4ng.net'
        from='admin@peebx.4ng.net'>
      <query xmlns='http://jabber.org/protocol/disco#info'/>
    </iq>

    <iq type='get'
        to='workgroup.peebx.4ng.net'
        from='admin@peebx.4ng.net'>
      <query xmlns='http://jabber.org/protocol/disco#items'
             node='http://jabber.org/protocol/commands'/>
    </iq>

    <iq type='get'
        to='workgroup.peebx.4ng.net'
        from='admin@peebx.4ng.net'>
      <query xmlns='http://jabber.org/protocol/disco#info'
             node='http://jabber.org/protocol/admin#add-workgroup'/>
    </iq>

    <iq type='set' to='workgroup.peebx.4ng.net'>
      <command xmlns='http://jabber.org/protocol/commands' sessionid='DYAHDC3ZMbKdAnQ' node='http://jabber.org/protocol/admin#add-workgroup'>
        <x xmlns='jabber:x:data' type='submit'>
          <field var='FORM_TYPE'>
            <value>http://jabber.org/protocol/admin</value>
          </field>
          <field var='name'>
            <value>test123</value>
          </field>
          <field var='members'>
            <value>dele.olajide</value>
            <value>deleo</value>
          </field>
          <field var='description'>
            <value>Workgroup for test123</value>
          </field>
        </x>
      </command>
    </iq>
*/

    public String createWorkgroup(String workgroup, String description, String[] members)
    {
        if (adminConnection == null)
        {
            return "admin account unavailable";
        }

        String id = workgroup + "-" + System.currentTimeMillis();
        String response = null;

        IQ iq = new IQ(IQ.Type.set);
        iq.setFrom("admin@" + DOMAIN);
        iq.setTo("workgroup." + DOMAIN);
        iq.setID(id);

        Element command = iq.setChildElement("command", "http://jabber.org/protocol/commands");
        command.addAttribute("node", "http://jabber.org/protocol/admin#add-workgroup");

        Element x = command.addElement("x", "jabber:x:data");
        x.addAttribute("type", "submit");
        x.addElement("field").addAttribute("var", "FORM_TYPE").addElement("value").setText("http://jabber.org/protocol/admin");
        x.addElement("field").addAttribute("var", "name").addElement("value").setText(workgroup);

        Element membersEl = x.addElement("field").addAttribute("var", "members");

        for (int i=0; i<members.length; i++)
        {
            membersEl.addElement("value").setText(members[i].trim());
        }

        x.addElement("field").addAttribute("var", "description").addElement("value").setText(description);

        addhocCommands.put(id, iq);
        adminConnection.getRouter().route(iq);
        return response;
    }

    public String deleteWorkgroup(String workgroup)
    {
        if (adminConnection == null)
        {
            return "admin account unavailable";
        }

        String id = workgroup + "-" + System.currentTimeMillis();
        String response = null;

        IQ iq = new IQ(IQ.Type.set);
        iq.setFrom("admin@" + DOMAIN);
        iq.setTo("workgroup." + DOMAIN);
        iq.setID(id);

        Element command = iq.setChildElement("command", "http://jabber.org/protocol/commands");
        command.addAttribute("node", "http://jabber.org/protocol/admin#delete-workgroup");

        Element x = command.addElement("x", "jabber:x:data");
        x.addAttribute("type", "submit");
        x.addElement("field").addAttribute("var", "FORM_TYPE").addElement("value").setText("http://jabber.org/protocol/admin");
        x.addElement("field").addAttribute("var", "workgroup").addElement("value").setText(workgroup + "@workgroup." + DOMAIN);

        addhocCommands.put(id, iq);
        adminConnection.getRouter().route(iq);
        return response;
    }

    public class AdminConnection extends VirtualConnection
    {
        private SessionPacketRouter router;
        private String remoteAddr;
        private String hostName;
        private LocalClientSession session;
        private boolean isSecure = false;
        private String username = "admin";

        public AdminConnection()
        {
            this.remoteAddr = "0.0.0.0";
            this.hostName = username;

            try {
                AuthToken authToken = new AuthToken(username);
                session = SessionManager.getInstance().createClientSession(this, (Locale) null );
                this.router = new SessionPacketRouter(session);
                session.setAuthToken(authToken, "ofchat");

            } catch (Exception e) {
                Log.error("AdminConnection", e);
            }
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

        public void closeVirtualConnection()
        {
            Log.info("AdminConnection - close ");
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
            try {
                IQ iq = (IQ) packet;

                if (iq != null)
                {
                    Element iqCommand = iq.getChildElement();

                    if (iqCommand != null)
                    {
                        String sessionid = iqCommand.attributeValue("sessionid");
                        String id = iq.getID();

                        if (sessionid != null && addhocCommands.containsKey(id))
                        {
                            IQ adhoc = addhocCommands.remove(id);
                            adhoc.setID(id + "-" + sessionid);
                            Element adhocCommand = adhoc.getChildElement();
                            adhocCommand.addAttribute("sessionid", sessionid);
                            adminConnection.getRouter().route(adhoc);
                        }
                    }
                }
            } catch (Exception e) {
                //Log.error("deliver", e);
            }

            deliverRawText(packet.toXML());
        }

        public void deliverRawText(String text)
        {
            Log.info("AdminConnection - deliverRawText\n" + text);
        }

        @Override
        public org.jivesoftware.openfire.spi.ConnectionConfiguration getConfiguration()
        {
            return null;
        }

        public Certificate[] getPeerCertificates() {
            return null;
        }

    }
}
