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
import java.io.IOException;
import java.util.*;
import java.net.*;
import java.util.concurrent.*;
import java.lang.reflect.*;
import java.security.Security;
import java.security.cert.Certificate;

import java.nio.charset.Charset;
import java.nio.file.attribute.FileTime;
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
import org.jivesoftware.openfire.vcard.VCardManager;
import org.jivesoftware.openfire.user.*;
import org.jivesoftware.openfire.event.*;
import org.jivesoftware.openfire.group.*;
import org.jivesoftware.openfire.roster.*;
import org.jivesoftware.openfire.muc.*;
import org.jivesoftware.openfire.session.*;
import org.jivesoftware.openfire.interceptor.*;
import org.jivesoftware.openfire.plugin.spark.*;
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
import org.jivesoftware.util.*;

import org.eclipse.jetty.apache.jsp.JettyJasperInitializer;
import org.eclipse.jetty.plus.annotation.ContainerInitializer;
import org.eclipse.jetty.server.handler.ContextHandlerCollection;
import org.eclipse.jetty.servlet.*;
import org.eclipse.jetty.server.Handler;
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
import org.dom4j.DocumentException;
import org.dom4j.DocumentHelper;
import net.sf.json.*;
import org.jitsi.util.OSUtils;

import org.traderlynk.blast.MessageBlastService;
import org.jivesoftware.openfire.sip.sipaccount.SipAccount;

/**
 * The Class RESTServicePlugin.
 */
public class RESTServicePlugin implements Plugin, SessionEventListener, PropertyEventListener, PacketInterceptor, MUCEventListener {
    private static final Logger Log = LoggerFactory.getLogger(RESTServicePlugin.class);

    /** The Constant INSTANCE. */
    public static RESTServicePlugin INSTANCE = null;

    private static final String CUSTOM_AUTH_FILTER_PROPERTY_NAME = "plugin.ofchat.customAuthFilter";
    private static final UserManager userManager = XMPPServer.getInstance().getUserManager().getInstance();
    private static final PresenceManager presenceManager = XMPPServer.getInstance().getPresenceManager();
    private static final String SERVER = XMPPServer.getInstance().getServerInfo().getHostname();
    private static final String DOMAIN = XMPPServer.getInstance().getServerInfo().getXMPPDomain();
    private static final RosterManager ROSTER_MANAGER = XMPPServer.getInstance().getRosterManager();
    private static final MessageRouter MESSAGE_ROUTER = XMPPServer.getInstance().getMessageRouter();

    private static Map<String, IQ>  registrations = new HashMap<String, IQ>();
    private static Map<String, String> pushTracker = new HashMap<String, String>();

    /** The authentication secret. */
    private String secret;

    /** The permission secret. */
    private String permission;

    /** The allowed i ps. */
    private Collection<String> allowedIPs;

    /** The enabled. */
    private boolean enabled;
    private boolean smsEnabled;
    private boolean emailEnabled;
    private String smsProvider;
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
    private WebAppContext context5;
    private WebAppContext context6;
    private WebAppContext context7;
    private WebAppContext warfile;
    public File pluginDirectory;

    private ExecutorService executor;
    private Plugin ofswitch = null;
    private AdminConnection adminConnection = null;

    public Cache<String, SipAccount> sipCache;
    public Cache<String, SipAccount> sipCache2;

    private Map<String, IQ> addhocCommands;
    private TempFileToucherTask tempFileToucherTask;
    private ArrayList<Handler> handlers = new ArrayList<>();


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
        addhocCommands = new ConcurrentHashMap<String, IQ>();

        INSTANCE = this;
        this.pluginDirectory = pluginDirectory;

        SessionEventDispatcher.addListener(this);

        secret = JiveGlobals.getProperty("plugin.ofchat.secret", "");

        // If no secret key has been assigned, assign a random one.
        if ("".equals(secret)) {
            secret = StringUtils.randomString(16);
            setSecret(secret);
        }

        permission = JiveGlobals.getProperty("plugin.ofchat.permission", "");

        // If no permission key has been assigned, assign a random one.
        if ("".equals(permission)) {
            permission = "Wa1l7M9NoGwcxxdX"; // default value in all web apps
            setPermission(permission);
        }

        Log.info("Initialize REST");

        // See if Custom authentication filter has been defined
        customAuthFilterClassName = JiveGlobals.getProperty("plugin.ofchat.customAuthFilter", "");

        // See if the service is enabled or not.
        enabled = JiveGlobals.getBooleanProperty("plugin.ofchat.enabled", true);
        smsEnabled = JiveGlobals.getBooleanProperty("ofchat.sms.enabled", false);
        emailEnabled = JiveGlobals.getBooleanProperty("ofchat.email.enabled", false);
        smsProvider = JiveGlobals.getProperty("ofchat.sms.provider", "mexmo");
        adhocEnabled = JiveGlobals.getBooleanProperty("ofchat.adhoc.commands.enabled", false);
        swaggerSecure = JiveGlobals.getBooleanProperty("ofchat.swagger.secure", false);

        // See if the HTTP Basic Auth is enabled or not.
        httpAuth = JiveGlobals.getProperty("plugin.ofchat.httpAuth", "basic");

        // Get the list of IP addresses that can use this service. An empty list
        // means that this filter is disabled.
        allowedIPs = StringUtils.stringToCollection(JiveGlobals.getProperty("plugin.ofchat.allowedIPs", ""));

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
        handlers.add(context);

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
        handlers.add(context2);


        Log.info("Initialize Swagger WebService ");

        context3 = new WebAppContext(null, pluginDirectory.getPath() + "/classes/swagger", "/swagger");
        context3.setClassLoader(this.getClass().getClassLoader());
        final List<ContainerInitializer> initializers3 = new ArrayList<>();
        initializers3.add(new ContainerInitializer(new JettyJasperInitializer(), null));
        context3.setAttribute("org.eclipse.jetty.containerInitializers", initializers3);
        context3.setAttribute(InstanceManager.class.getName(), new SimpleInstanceManager());
        context3.setWelcomeFiles(new String[]{"index.html"});

        HttpBindManager.getInstance().addJettyHandler(context3);
        handlers.add(context3);

        Log.info("Initialize Dashboard WebService ");

        context5 = new WebAppContext(null, pluginDirectory.getPath() + "/classes/dashboard", "/dashboard");
        context5.setClassLoader(this.getClass().getClassLoader());
        context5.getMimeTypes().addMimeMapping("wasm", "application/wasm");

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
        handlers.add(context5);

        Log.info("Initialize Unsecure Apps WebService ");

        context6 = new WebAppContext(null, pluginDirectory.getPath() + "/classes/apps", "/apps");
        context6.setClassLoader(this.getClass().getClassLoader());
        context6.getMimeTypes().addMimeMapping("wasm", "application/wasm");

        final List<ContainerInitializer> initializers6 = new ArrayList<>();
        initializers6.add(new ContainerInitializer(new JettyJasperInitializer(), null));
        context6.setAttribute("org.eclipse.jetty.containerInitializers", initializers6);
        context6.setAttribute(InstanceManager.class.getName(), new SimpleInstanceManager());
        context6.setWelcomeFiles(new String[]{"index.jsp"});

        HttpBindManager.getInstance().addJettyHandler(context6);
        handlers.add(context6);

        Log.info("Initialize Windows SSO WebService ");

        context7 = new WebAppContext(null, pluginDirectory.getPath() + "/classes/win-sso", "/sso");
        context7.setClassLoader(this.getClass().getClassLoader());

        final List<ContainerInitializer> initializers7 = new ArrayList<>();
        initializers7.add(new ContainerInitializer(new JettyJasperInitializer(), null));
        context7.setAttribute("org.eclipse.jetty.containerInitializers", initializers7);
        context7.setAttribute(InstanceManager.class.getName(), new SimpleInstanceManager());
        context7.setWelcomeFiles(new String[]{"index.jsp"});

        if (OSUtils.IS_WINDOWS && JiveGlobals.getBooleanProperty("ofchat.kerberos.enabled", false) == false)
        {
            Log.info("Initialize waffle security filter");

            waffle.servlet.NegotiateSecurityFilter securityFilter = new waffle.servlet.NegotiateSecurityFilter();
            FilterHolder filterHolder = new FilterHolder();
            filterHolder.setFilter(securityFilter);
            EnumSet<DispatcherType> enums = EnumSet.of(DispatcherType.REQUEST);
            enums.add(DispatcherType.REQUEST);

            context7.addFilter(filterHolder, "/*", enums);
            context7.addServlet(new ServletHolder(new waffle.servlet.WaffleInfoServlet()), "/waffle");
        }
        else {
            String domainRealm = JiveGlobals.getProperty("ofchat.kerberos.realm", DOMAIN);
            System.setProperty("javax.security.auth.useSubjectCredsOnly", JiveGlobals.getProperty("ofchat.kerberos.useSubject_credsOnly", "false"));
            System.setProperty("java.security.auth.login.config", JiveGlobals.getProperty("ofchat.kerberos.login.config", "."));
            System.setProperty("java.security.krb5.conf", JiveGlobals.getProperty("ofchat.kerberos.krb5.config", "."));

            System.setProperty("org.eclipse.jetty.LEVEL", "debug");
            System.setProperty("sun.security.spnego.debug", "all");

            Log.info("Initialize kerberos security handler: realm=" + domainRealm + ", usesubject.credsonly=" + System.getProperty("javax.security.auth.useSubjectCredsOnly") + ", login.config=" + System.getProperty("java.security.auth.login.config") + ", krb5.config=" + System.getProperty("java.security.krb5.conf"));

            Constraint constraint = new Constraint();
            constraint.setName(Constraint.__SPNEGO_AUTH);
            constraint.setRoles(new String[]{domainRealm});
            constraint.setAuthenticate(true);

            ConstraintMapping cm = new ConstraintMapping();
            cm.setConstraint(constraint);
            cm.setPathSpec("/*");

            SpnegoLoginService loginService = new SpnegoLoginService();
            loginService.setConfig(JiveGlobals.getProperty("ofchat.kerberos.spnego.config", "."));
            loginService.setName(domainRealm);

            ConstraintSecurityHandler sh = new ConstraintSecurityHandler();
            sh.setAuthenticator(new SpnegoAuthenticator());
            sh.setConstraintMappings(new ConstraintMapping[]{cm});
            sh.setRealmName(domainRealm);
            sh.setLoginService(loginService);
            context7.setSecurityHandler(sh);
        }

        context7.addServlet(new ServletHolder(new org.ifsoft.sso.Password()), "/password");

        HttpBindManager.getInstance().addJettyHandler(context7);
        handlers.add(context7);

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
                handlers.add(proxyContext);
            }
        }

        Log.info("Initialize Email Listener");
        EmailListener.getInstance().start();

        Log.info("Initialize preffered property default values");
        JiveGlobals.setProperty("route.all-resources", "true");     // send chat messages to all resources

        JiveGlobals.setProperty("uport.clientid.etherlynk.2ofdeAidaU2mjJ5X8r1CgH2RdPb9qKVS9pc", "1b561603d69de7091fa9cee632741f7f313b4dd39bc328d38dc514bbb5f184e3");
        JiveGlobals.setProperty("uport.clientid.pade.2p1psGHt9J5NBdPDQejSVhpsECXLxLaVQSo", "46445273c02e4c0594ef6a441ecbcd327f0f78ba58b3139e027f0b23c199ea5f");

        try
        {
            Security.addProvider( new OfChatSaslProvider() );
            SASLAuthentication.addSupportedMechanism( OfChatSaslServer.MECHANISM_NAME );
            //loadWarFile();
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

        if ( JiveGlobals.getBooleanProperty("webpush.subscribe.session", false ) )
        {
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
                                Log.info("Auto-login for user " + username + " successfull");
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
        }

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

        if ( smsEnabled || EmailListener.getInstance().isSmtpEnabled())
        {
            Log.info("Setup SMS/Email message interceptor");
            InterceptorManager.getInstance().addInterceptor(this);
        }

        if ( JiveGlobals.getBooleanProperty( "ofchat.toucher.enabled", true))
        {
            tempFileToucherTask = new TempFileToucherTask();
            final long period = JiveGlobals.getLongProperty( "jetty.temp-file-toucher.period", JiveConstants.DAY );
            TaskEngine.getInstance().schedule( tempFileToucherTask, period, period );
        }

        if ( JiveGlobals.getBooleanProperty( "ofchat.mucevent.dispatcher.enabled", true))
        {
            MUCEventDispatcher.addListener(this);
        }
    }

    /* (non-Javadoc)
     * @see org.jivesoftware.openfire.container.Plugin#destroyPlugin()
     */
    public void destroyPlugin() {

        try {
            OpenfireConnection.removeAllConnections();
        } catch (Exception e) {}

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
        HttpBindManager.getInstance().removeJettyHandler(context5);
        HttpBindManager.getInstance().removeJettyHandler(context6);

        if (context7 != null) HttpBindManager.getInstance().removeJettyHandler(context7);

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

            //unloadWarFile();
        } catch (Exception e) {}

        InterceptorManager.getInstance().removeInterceptor(this);

        if ( tempFileToucherTask != null )
        {
            TaskEngine.getInstance().cancelScheduledTask( tempFileToucherTask );
            tempFileToucherTask = null;
        }

        if ( JiveGlobals.getBooleanProperty( "ofchat.mucevent.dispatcher.enabled", true))
        {
            MUCEventDispatcher.removeListener(this);
        }
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
        JiveGlobals.setProperty("plugin.ofchat.secret", secret);
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
        JiveGlobals.setProperty("plugin.ofchat.permission", permission);
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
        JiveGlobals.setProperty("plugin.ofchat.allowedIPs", StringUtils.collectionToString(allowedIPs));
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
        JiveGlobals.setProperty("plugin.ofchat.enabled", enabled ? "true" : "false");
    }

    public boolean isEmailEnabled() {
        return emailEnabled;
    }

    public void setEmailEnabled(boolean emailEnabled) {
        this.emailEnabled = emailEnabled;
        JiveGlobals.setProperty("ofchat.email.enabled", emailEnabled ? "true" : "false");
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

    public String getSmsProvider() {
        return smsProvider;
    }

    public void setSmsProvider(String smsProvider) {
        this.smsProvider = smsProvider;
        JiveGlobals.setProperty("ofchat.sms.provider", smsProvider);
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
        JiveGlobals.setProperty("plugin.ofchat.httpAuth", httpAuth);
    }

    /* (non-Javadoc)
     * @see org.jivesoftware.util.PropertyEventListener#propertySet(java.lang.String, java.util.Map)
     */
    public void propertySet(String property, Map<String, Object> params) {
        if (property.equals("plugin.ofchat.secret")) {
            this.secret = (String) params.get("value");
        } else if (property.equals("plugin.ofchat.permission")) {
            this.permission = (String) params.get("value");
        } else if (property.equals("plugin.ofchat.enabled")) {
            this.enabled = Boolean.parseBoolean((String) params.get("value"));
        } else if (property.equals("plugin.ofchat.allowedIPs")) {
            this.allowedIPs = StringUtils.stringToCollection((String) params.get("value"));
        } else if (property.equals("plugin.ofchat.httpAuth")) {
            this.httpAuth = (String) params.get("value");
        } else if(property.equals(CUSTOM_AUTH_FILTER_PROPERTY_NAME)) {
            this.customAuthFilterClassName = (String) params.get("value");
        }
    }

    /* (non-Javadoc)
     * @see org.jivesoftware.util.PropertyEventListener#propertyDeleted(java.lang.String, java.util.Map)
     */
    public void propertyDeleted(String property, Map<String, Object> params) {
        if (property.equals("plugin.ofchat.secret")) {
            this.secret = "";
        } else if (property.equals("plugin.ofchat.permission")) {
            this.permission = "";
        } else if (property.equals("plugin.ofchat.enabled")) {
            this.enabled = false;
        } else if (property.equals("plugin.ofchat.allowedIPs")) {
            this.allowedIPs = Collections.emptyList();
        } else if (property.equals("plugin.ofchat.httpAuth")) {
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
        Log.debug("addServlet " + holder.getName());

        try {
            context2.addServlet(holder, path);
        } catch (Exception e) {

        }
    }

    public void removeServlets(ServletHolder deleteHolder)
    {
       Log.debug("removeServlets " + deleteHolder.getName());

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
        constraint.setRoles(new String[]{"ofchat", "webapp-owner", "webapp-contributor", "warfile-admin"});
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
        String ourIpAddress = SERVER;

        try {
            ourIpAddress = InetAddress.getByName(SERVER).getHostAddress();
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
        if (packet instanceof IQ) {

            IQ iq = (IQ)packet;
            Element childElement = iq.getChildElement();

            if (childElement == null) {
                return;
            }
            String namespace = childElement.getNamespaceURI();
            String from = childElement.attributeValue("from");

            if ("http://igniterealtime.org/ofchat/register".equals(namespace))
            {
                if (iq.getType() != IQ.Type.result && !processed && incoming)
                {
                    Log.debug("interceptPacket - register user account " + from);

                    if (from != null)
                    {
                        User fromUser = null;
                        try {fromUser = userManager.getUser(from);} catch (Exception e1) {}

                        if (fromUser == null)
                        {
                            String email = childElement.attributeValue("email");

                            registrations.put(email, iq);

                            if (JiveGlobals.getBooleanProperty("register.inband", false))   // no email validation required
                            {
                                emailIncoming(email, null, null);
                            }
                            else {
                                String name = childElement.attributeValue("name");
                                String subject = childElement.attributeValue("subject");
                                String body = childElement.getText();

                                MeetService.sendEmailMessage(null, email, name, from, subject, body, null);
                            }

                        } else {
                            IQ reply = IQ.createResultIQ(iq);
                            Element child = reply.setChildElement("register", namespace);

                            child.addAttribute("error", "user already registered");
                            XMPPServer.getInstance().getIQRouter().route(reply);
                        }
                    }
                    else {
                        IQ reply = IQ.createResultIQ(iq);
                        Element child = reply.setChildElement("register", namespace);

                        child.addAttribute("error", "register jid missing");
                        XMPPServer.getInstance().getIQRouter().route(reply);
                    }

                    throw new PacketRejectedException();
                }
            }
        }
        else

        if (packet instanceof Message && processed)
        {
            if (!incoming) {
                return;
            }

            Message message = (Message) packet;
            final JID fromJID = message.getFrom();
            final JID toJID = message.getTo();
            final String body = message.getBody();

            if (body != null && fromJID != null && toJID != null)
            {
                if (fromJID.getNode() != null && toJID.getNode() != null  && DOMAIN.equals(toJID.getDomain()))
                {
                    try {
                        String from = fromJID.getNode();
                        String to = JID.unescapeNode(toJID.getNode());

                        User fromUser = null;
                        try {fromUser = userManager.getUser(from);} catch (Exception e3) {}

                        User toUser = null;
                        try {toUser = userManager.getUser(to);} catch (Exception e2) {}

                        Log.debug("intercepted message from {} to {}, recipient is available {}\n{}", new Object[]{from, to, body});

                        if (toUser != null)
                        {
                            // web push

                            boolean available = presenceManager.isAvailable(toUser);

                            String pushUrl = "./index.html#converse/chat?jid=" + fromJID.toBareJID();
                            String pushBody = body;
                            String pushName = from;

                            if (fromUser != null && !fromUser.getName().equals("")) pushName = fromUser.getName();

                            Element notification = message.getChildElement("notification", "http://igniterealtime.org/ofchat/notification");

                            if (notification != null)
                            {
                                pushUrl = "./index.html#converse/room?jid=" + fromJID.toBareJID();
                                pushName = notification.attributeValue("nickname");
                                pushBody = notification.getText();
                            }

                            if (JiveGlobals.getBooleanProperty("plugin.ofchat.push.always", true))
                            {
                                MeetController.getInstance().postWebPush(to, "{\"title\":\"" + pushName + "\", \"url\": \"" + pushUrl + "\", \"message\": \"" + pushBody + "\"}");
                            }
                            else {
                                if (!available)
                                {
                                    if (!pushTracker.containsKey(pushUrl))
                                    {
                                        MeetController.getInstance().postWebPush(to, "{\"title\":\"" + pushName + "\", \"url\": \"" + pushUrl + "\", \"message\": \"" + pushBody + "\"}");
                                        pushTracker.put(pushUrl, pushBody);
                                    }
                                }
                                else {  // reset tracker
                                    pushTracker.remove(pushUrl);
                                }
                            }
                        }

                        if (fromUser != null && DOMAIN.equals(fromJID.getDomain()) && Message.Type.chat == message.getType())
                        {
                            String smsFrom = fromUser.getProperties().get("sms_out_number");

                            if (smsFrom != null)    // SMS
                            {
                                Log.debug("interceptPacket - sms " + smsFrom);

                                String smsTo = null;

                                if (to.startsWith("sms-"))  // reply to SMS
                                {
                                    smsTo = to.substring(4);

                                } else {                    // forward to SMS of reciever if available
                                                            // TODO - check presence. if online don't forward

                                    if (toUser != null) smsTo = toUser.getProperties().get("sms_in_number");
                                }

                                if (smsTo != null)
                                {
                                    if ("nexmo".equals(JiveGlobals.getProperty("ofchat.sms.provider", "nexmo")))
                                    {
                                        org.ifsoft.sms.nexmo.Servlet.smsOutgoing(smsTo, smsFrom, body);
                                    }
                                }
                            }

                            if (to.indexOf("@") > -1)       // EMAIL
                            {
                                Log.debug("interceptPacket - email to " + to + " " + from);

                                org.jivesoftware.openfire.roster.Roster roster = ROSTER_MANAGER.getRoster(from);

                                if (roster != null)
                                {
                                    RosterItem friend = roster.getRosterItem(toJID);

                                    Log.debug("interceptPacket - email roster " + friend.getNickname() + " " + fromJID.getResource());

                                    if (friend != null)
                                    {
                                        MeetService.sendEmailMessage(friend.getNickname(), to, fromUser.getName(), fromJID.toBareJID(), fromJID.getResource(), body, null);
                                    }
                                }
                            }
                        }

                    } catch (Exception e) {
                        Log.error("interceptPacket", e);
                    }
                }
            }
        }
    }

    public static boolean emailAccept(String from, String to)
    {
        if (registrations.containsKey(from)) return true;       // account registration by email

        boolean accept = false;

        try {
            org.jivesoftware.openfire.roster.Roster roster = ROSTER_MANAGER.getRoster(to.split("@")[0]);

            if (roster != null)
            {
                String fromJid = JID.escapeNode(from) + "@" + DOMAIN;
                RosterItem friend = roster.getRosterItem(new JID(fromJid));
                accept = friend != null;

                if (accept)
                {
                    OpenfireConnection conn = OpenfireConnection.createConnection(JID.escapeNode(from), null, true);
                    conn.postPresence("available", null);
                }
            }


        } catch (Exception e) {
            Log.error("emailAccept", e);
        }

        return accept;
    }


    public static void emailIncoming(String from, String toJid, String text)
    {
        if (registrations.containsKey(from))
        {
            IQ iq = registrations.remove(from);
            String namespace = iq.getChildElement().getNamespaceURI();
            IQ reply = IQ.createResultIQ(iq);
            Element child = reply.setChildElement("register", namespace);

            Element register = iq.getChildElement();
            String email = register.attributeValue("email");
            String userJid = register.attributeValue("from");
            String name = register.attributeValue("name");
            String avatar = register.attributeValue("avatar");

            String password = register.attributeValue("password");
            if (password == null) password = PasswordGenerator.generate(16);
            child.addAttribute("password", password);

            try {
                Log.debug("emailIncoming: Creating user " + userJid + " " + name + " " + password + " " + email + "\n" + avatar);

                Group group = null;
                JID jid = new JID(userJid);
                String groupName = email.split("@")[1];
                String userName = jid.getNode();

                User user = userManager.createUser(userName, password, name, email);

                VCardManager.getInstance().setVCard(userName, getDefaultVCard(userName, userJid, password, name, email, avatar));

                try {
                    group = GroupManager.getInstance().getGroup(groupName);

                } catch (GroupNotFoundException e1) {
                    try {
                        group = GroupManager.getInstance().createGroup(groupName);
                        group.setDescription(groupName);
                        group.getProperties().put("sharedRoster.showInRoster", "onlyGroup");
                        group.getProperties().put("sharedRoster.displayName", groupName);
                        group.getProperties().put("sharedRoster.groupList", "");

                    } catch (Exception e4) {
                        // not possible to create group, just ignore
                    }
                }

                MUCRoom chatRoom = XMPPServer.getInstance().getMultiUserChatManager().getMultiUserChatService("conference").getChatRoom(groupName);

                if (chatRoom == null)
                {
                    try {
                        createRoom(groupName, group.getDescription());
                    } catch (NotAllowedException e) {
                        // not possible to create chat room, just ignore
                    }
                }

                try {
                    String bookmarkValue = groupName + "@conference." + DOMAIN;

                    long id = -1;

                    for (Bookmark bookmark : BookmarkManager.getBookmarks())
                    {
                        if (bookmark.getValue().equals(bookmarkValue)) id = bookmark.getBookmarkID();
                    }

                    if (id == -1)
                    {
                        Bookmark book = new Bookmark(Bookmark.Type.group_chat, group.getDescription(), bookmarkValue, null, new ArrayList<String>(Arrays.asList(new String[] {groupName})));
                        book.setProperty("autojoin", "true");
                    }

                } catch (Exception e) {
                    // not possible to create book mark, just ignore
                }

                if (group != null) group.getMembers().add(XMPPServer.getInstance().createJID(userName, null));
            }
            catch (Exception e2) {
                Log.error("emailIncoming: Failed creating user " + userJid, e2);
                child.addAttribute("error", e2.toString());
            }

            XMPPServer.getInstance().getIQRouter().route(reply);
            return;
        }

        String fromJid = JID.escapeNode(from) + "@" + DOMAIN;

        Message message = new Message();
        message.setType(Message.Type.chat);
        message.setFrom(fromJid);
        message.setTo(toJid);

        int pos1 = text.indexOf("-- \n");
        int pos2 = text.indexOf("--\n");
        int pos3 = text.indexOf("From: ");
        int pos4 = text.indexOf("-----Original Message-----");
        int pos5 = text.indexOf("________________________________");
        int pos6 = text.indexOf("--------------------");
        int pos7 = text.indexOf("Sent from ");

        String msg = text;

        if (pos1 > -1) msg = text.substring(0, pos1);
        if (pos2 > -1) msg = text.substring(0, pos2);
        if (pos3 > -1) msg = text.substring(0, pos3);
        if (pos4 > -1) msg = text.substring(0, pos4);
        if (pos5 > -1) msg = text.substring(0, pos5);
        if (pos6 > -1) msg = text.substring(0, pos6);
        if (pos7 > -1) msg = text.substring(0, pos7);

        message.setBody(msg);

        MESSAGE_ROUTER.route(message);
    }

    private static void createRoom(String name, String displayName) throws NotAllowedException
    {
        MUCRoom room = XMPPServer.getInstance().getMultiUserChatManager().getMultiUserChatService("conference").getChatRoom(name, XMPPServer.getInstance().createJID("admin", null));

        List<String> roles = new ArrayList<String>();
        roles.add("moderator");
        roles.add("participant");
        roles.add("visitor");

        room.setNaturalLanguageName(displayName);
        room.setSubject(null);
        room.setDescription(displayName + " Discussions");
        room.setPassword(null);
        room.setPersistent(true);
        room.setPublicRoom(true);
        room.setRegistrationEnabled(false);
        room.setCanAnyoneDiscoverJID(true);
        room.setCanOccupantsChangeSubject(true);
        room.setCanOccupantsInvite(true);
        room.setChangeNickname(true);
        room.setCreationDate(new Date());
        room.setModificationDate(new Date());
        room.setLogEnabled(true);
        room.setLoginRestrictedToNickname(false);
        room.setMaxUsers(30);
        room.setMembersOnly(false);
        room.setModerated(false);
        room.setRolesToBroadcastPresence(roles);

        try {
            room.unlock(room.getRole());
            room.saveToDB();

        } catch (Exception re) {
            // not possible to create chat room, just ignore
        }
    }

    private static Element getDefaultVCard(String username, String jid, String password, String name, String email, String avatar)
    {
        String lastname = "";
        String firstname = name;
        String[] avatarData = {"data:image/svg+xml", "PD94bWwgdmVyc2lvbj0iMS4wIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCI+CiA8cmVjdCB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgZmlsbD0iIzU1NSIvPgogPGNpcmNsZSBjeD0iNjQiIGN5PSI0MSIgcj0iMjQiIGZpbGw9IiNmZmYiLz4KIDxwYXRoIGQ9Im0yOC41IDExMiB2LTEyIGMwLTEyIDEwLTI0IDI0LTI0IGgyMyBjMTQgMCAyNCAxMiAyNCAyNCB2MTIiIGZpbGw9IiNmZmYiLz4KPC9zdmc+Cg=="};
        int pos = name.indexOf(" ");

        if (pos > -1)
        {
            lastname = name.substring(pos + 1);
            firstname = name.substring(0, pos);
        }

        if (avatar != null && avatar.indexOf(";base64,") > -1)
        {
            avatarData = avatar.split(";base64,");
        }

        try {
            String xml = "<vCard xmlns=\"vcard-temp\"><N><FAMILY>" + lastname + "</FAMILY><GIVEN>" + firstname + "</GIVEN><MIDDLE></MIDDLE></N><ORG><ORGNAME></ORGNAME><ORGUNIT/></ORG><FN>" + name + "</FN><ROLE/><DESC/><JABBERID>" + jid + "</JABBERID><userName>" + username + "</userName><server>" + SERVER + "</server><URL/><NICKNAME>" + name + "</NICKNAME><TITLE/><PHOTO><TYPE>" + avatarData[0].substring(5) + "</TYPE><BINVAL>" + avatarData[1] + "</BINVAL></PHOTO><EMAIL><WORK/><INTERNET/><PREF/><USERID>" + email + "</USERID></EMAIL><EMAIL><HOME/><INTERNET/><PREF/><USERID>" + email + "</USERID></EMAIL><TEL><PAGER/><WORK/><NUMBER/></TEL><TEL><CELL/><WORK/><NUMBER/></TEL><TEL><VOICE/><WORK/><NUMBER/></TEL><TEL><FAX/><WORK/><NUMBER/></TEL><TEL><PAGER/><HOME/><NUMBER/></TEL><TEL><CELL/><HOME/><NUMBER/></TEL><TEL><VOICE/><HOME/><NUMBER/></TEL><TEL><FAX/><HOME/><NUMBER/></TEL><ADR><WORK/><EXTADD/><PCODE></PCODE><REGION></REGION><STREET></STREET><CTRY></CTRY><LOCALITY></LOCALITY></ADR><ADR><HOME/><EXTADD/><PCODE/><REGION/><STREET/><CTRY/><LOCALITY/></ADR></vCard>";
            return DocumentHelper.parseText(xml).getRootElement();
        } catch (DocumentException e) {
            return null;
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
                        // real user with xmpp account
                        fromJid = fromUsers.get(0) + "@" + DOMAIN;
                    } else {
                        String fromSMS = "sms-" + sms.getString("msisdn");
                        fromJid = fromSMS + "@" + DOMAIN;

                        OpenfireConnection conn = OpenfireConnection.createConnection(fromSMS, null, true);
                        conn.postPresence("available", null);
                    }

                    Message message = new Message();
                    message.setType(Message.Type.chat);
                    message.setFrom(fromJid);
                    message.setTo(toJid);
                    message.setBody(sms.getString("text"));

                    MESSAGE_ROUTER.route(message);
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
        boolean bruteForceLogoff = JiveGlobals.getBooleanProperty("ofmeet.bruteforce.logoff", false);

        if (bruteForceLogoff)
        {
            Log.debug("logoff - " + jid);

            String userJid = jid.toBareJID();

            for ( MultiUserChatService mucService : XMPPServer.getInstance().getMultiUserChatManager().getMultiUserChatServices() )
            {
                List<MUCRoom> rooms = mucService.getChatRooms();

                for (MUCRoom chatRoom : rooms)
                {
                    try {
                        Log.debug("forcing " + userJid + " out of " + chatRoom.getName());

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

    protected void loadWarFile() throws Exception
    {
        Log.debug( "Initializing warfile application" );
        Log.debug( "Identify the name of the warfile archive file" );

        final File libs = new File(pluginDirectory.getPath() + File.separator + "classes");

        final File[] matchingFiles = libs.listFiles( new FilenameFilter()
        {
            public boolean accept(File dir, String name)
            {
                return name.toLowerCase().endsWith(".war");
            }
        });

        final File warfileApp;
        switch ( matchingFiles.length )
        {
            case 0:
                Log.error( "Unable to find public web application archive for warfile!" );
                return;

            default:
                Log.warn( "Found more than one public web application archive for warfile. Using an arbitrary one." );
                // intended fall-through.

            case 1:
                warfileApp = matchingFiles[0];
                Log.debug( "Using this archive: {}", warfileApp );
        }

        Log.debug( "Creating new WebAppContext for warfile." );

        warfile = new WebAppContext();
        warfile.setWar( warfileApp.getAbsolutePath() );

        String webappName = JiveGlobals.getProperty("warfile.webapp.name", "webapp");
        warfile.setContextPath( "/" + webappName);

        final List<ContainerInitializer> initializers = new ArrayList<>();
        initializers.add(new ContainerInitializer(new JettyJasperInitializer(), null));
        warfile.setAttribute("org.eclipse.jetty.containerInitializers", initializers);
        warfile.setAttribute(InstanceManager.class.getName(), new SimpleInstanceManager());

        HttpBindManager.getInstance().addJettyHandler( warfile );
        handlers.add(warfile);

        Log.debug( "Initialized warfile application" );
    }

    public void unloadWarFile() throws Exception
    {
        if ( warfile != null )
        {
            try
            {
                HttpBindManager.getInstance().removeJettyHandler( warfile );
                warfile.destroy();
            }
            finally
            {
                warfile = null;
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
                Log.debug("Refreshing client certificates");

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

                            Log.debug("Client certificate " + alias);

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
        String response = null;

        try {
            String id = workgroup + "-" + System.currentTimeMillis();

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

        } catch (Exception e) {
            response = e.toString();
            Log.error("createWorkgroup", e);
        }
        return response;
    }

    public String updateWorkgroup(String workgroup, String[] members)
    {
        if (adminConnection == null)
        {
            return "admin account unavailable";
        }
        String response = null;

        try {
            String id = workgroup + "-" + System.currentTimeMillis();

            IQ iq = new IQ(IQ.Type.set);
            iq.setFrom("admin@" + DOMAIN);
            iq.setTo("workgroup." + DOMAIN);
            iq.setID(id);

            Element command = iq.setChildElement("command", "http://jabber.org/protocol/commands");
            command.addAttribute("node", "http://jabber.org/protocol/admin#update-workgroup");

            Element x = command.addElement("x", "jabber:x:data");
            x.addAttribute("type", "submit");
            x.addElement("field").addAttribute("var", "FORM_TYPE").addElement("value").setText("http://jabber.org/protocol/admin");
            x.addElement("field").addAttribute("var", "workgroup").addElement("value").setText(workgroup + "@workgroup." + DOMAIN);

            Element membersEl = x.addElement("field").addAttribute("var", "members");

            for (int i=0; i<members.length; i++)
            {
                membersEl.addElement("value").setText(members[i].trim());
            }

            addhocCommands.put(id, iq);
            adminConnection.getRouter().route(iq);

        } catch (Exception e) {
            response = e.toString();
            Log.error("updateWorkgroup", e);
        }
        return response;
    }

    public String deleteWorkgroup(String workgroup)
    {
        if (adminConnection == null)
        {
            return "admin account unavailable";
        }

        String response = null;

        try {
            String id = workgroup + "-" + System.currentTimeMillis();

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

        } catch (Exception e) {
            response = e.toString();
            Log.error("deleteWorkgroup", e);
        }
        return response;
    }



    public void roomCreated(JID roomJID)
    {

    }

    public void roomDestroyed(JID roomJID)
    {

    }

    public void occupantJoined(JID roomJID, JID user, String nickname)
    {

    }

    public void occupantLeft(JID roomJID, JID user)
    {

    }

    public void nicknameChanged(JID roomJID, JID user, String oldNickname, String newNickname)
    {

    }

    public void messageReceived(JID roomJID, JID user, String nickname, Message message)
    {
        Log.debug("MUC messageReceived " + roomJID + " " + user + " " + nickname + "\n" + message.getBody());

        final String body = message.getBody();
        final String roomJid = roomJID.toString();
        final String userJid = user.toBareJID();

        if (body != null)
        {
            executor.submit(new Callable<Boolean>()
            {
                public Boolean call() throws Exception
                {
                    Bookmark bookmark = BookmarkManager.getBookmark(roomJid);

                    if ( bookmark != null)
                    {
                        BookmarkManager.broadcastMessage(roomJid, userJid, nickname, body, bookmark);
                    }
                    return true;
                }
            });
        }
    }

    public void roomSubjectChanged(JID roomJID, JID user, String newSubject)
    {

    }

    public void privateMessageRecieved(JID a, JID b, Message message)
    {

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
            Log.debug("AdminConnection - close ");
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
            Log.debug("AdminConnection - deliverRawText\n" + text);
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

    private class TempFileToucherTask extends TimerTask
    {
        @Override
        public void run()
        {
            final FileTime now = FileTime.fromMillis( System.currentTimeMillis() );
            for ( final Handler handler : handlers )
            {
                final File tempDirectory = ((WebAppContext) handler).getTempDirectory();
                try
                {
                    Log.debug( "Updating the last modified timestamp of content in Jetty's temporary storage in: {}", tempDirectory);
                    Files.walk( tempDirectory.toPath() )
                        .forEach( f -> {
                            try
                            {
                                Log.trace( "Setting the last modified timestamp of file '{}' in Jetty's temporary storage to: {}", f, now);
                                Files.setLastModifiedTime( f, now );
                            }
                            catch ( IOException e )
                            {
                                Log.warn( "An exception occurred while trying to update the last modified timestamp of content in Jetty's temporary storage in: {}", f, e );
                            }
                        } );
                }
                catch ( IOException e )
                {
                    Log.warn( "An exception occurred while trying to update the last modified timestamp of content in Jetty's temporary storage in: {}", tempDirectory, e );
                }
            }
        }
    }

    public static final class PasswordGenerator {

        private static final String LOWER = "abcdefghijklmnopqrstuvwxyz";
        private static final String UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        private static final String DIGITS = "0123456789";
        private static final String PUNCTUATION = "!@#$%&*()_+-=[]|,./?><";
        private static final boolean useLower = true;
        private static final boolean useUpper = true;
        private static final boolean useDigits = true;
        private static final boolean usePunctuation = false;

        public static String generate(int length) {
            // Argument Validation.
            if (length <= 0) {
                return "";
            }

            // Variables.
            StringBuilder password = new StringBuilder(length);
            Random random = new Random(System.nanoTime());

            // Collect the categories to use.
            List<String> charCategories = new ArrayList<>(4);
            if (useLower) {
                charCategories.add(LOWER);
            }
            if (useUpper) {
                charCategories.add(UPPER);
            }
            if (useDigits) {
                charCategories.add(DIGITS);
            }
            if (usePunctuation) {
                charCategories.add(PUNCTUATION);
            }

            // Build the password.
            for (int i = 0; i < length; i++) {
                String charCategory = charCategories.get(random.nextInt(charCategories.size()));
                int position = random.nextInt(charCategory.length());
                password.append(charCategory.charAt(position));
            }
            return new String(password);
        }
    }
}
