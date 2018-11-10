<%@ page
    import="java.util.*,
                org.jivesoftware.openfire.XMPPServer,
                org.jivesoftware.util.*,org.jivesoftware.openfire.plugin.rest.RESTServicePlugin,
                org.jivesoftware.openfire.container.Plugin,
                org.jivesoftware.openfire.container.PluginManager"
    errorPage="error.jsp"%>

<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt"%>

<%-- Define Administration Bean --%>
<jsp:useBean id="admin" class="org.jivesoftware.util.WebManager" />
<c:set var="admin" value="${admin.manager}" />
<%
    admin.init(request, response, session, application, out);
%>

<%
    // Get parameters
    boolean save = request.getParameter("save") != null;
    String msg = request.getParameter("msg");    
    boolean certificates = request.getParameter("certificates") != null;
    boolean success = request.getParameter("success") != null;
    String secret = ParamUtils.getParameter(request, "secret");
    String permission = ParamUtils.getParameter(request, "permission");    
    boolean enabled = ParamUtils.getBooleanParameter(request, "enabled");

    String smsProvider = request.getParameter("smsProvider");    
    
    String sms_enabled = request.getParameter("smsEnabled");    
    boolean smsEnabled = sms_enabled != null && sms_enabled.equals("on");
    
    String email_enabled = request.getParameter("emailEnabled");    
    boolean emailEnabled = email_enabled != null && email_enabled.equals("on");    
    
    String adhoc_enabled = request.getParameter("adhocEnabled");    
    boolean adhocEnabled = adhoc_enabled != null && adhoc_enabled.equals("on");    
    
    String swagger_secure = request.getParameter("swaggerSecure");    
    boolean swaggerSecure = swagger_secure != null && swagger_secure.equals("on");       
    
    String httpAuth = ParamUtils.getParameter(request, "authtype");
    String allowedIPs = ParamUtils.getParameter(request, "allowedIPs");
    String customAuthFilterClassName = ParamUtils.getParameter(request, "customAuthFilterClassName");
    
    String loadingStatus = null;
    
    final PluginManager pluginManager = admin.getXMPPServer().getPluginManager();
    
    RESTServicePlugin plugin = (RESTServicePlugin) XMPPServer.getInstance().getPluginManager().getPlugin("ofchat");

    // Handle a save
    Map errors = new HashMap();

    if (certificates) 
    {
        plugin.refreshClientCerts();        
        response.sendRedirect("rest-api.jsp?success=true&msg=Certificate Refresh Started (check log files)");
        return;        
    }
        
    if (save) {
        if("custom".equals(httpAuth)) {
            loadingStatus = plugin.loadAuthenticationFilter(customAuthFilterClassName);
        }
        if (loadingStatus != null) {
            errors.put("loadingStatus", loadingStatus);
        }
        
        if (errors.size() == 0) {
            
            boolean is2Reload = "custom".equals(httpAuth) || "custom".equals(plugin.getHttpAuth());
            plugin.setEnabled(enabled);
            plugin.setEmailEnabled(emailEnabled);      
            plugin.setSmsEnabled(smsEnabled);                
            plugin.setSmsProvider(smsProvider);            
            plugin.setAdhocEnabled(adhocEnabled);               
            plugin.setSwaggerSecure(swaggerSecure);                
            plugin.setPermission(permission);               
            plugin.setSecret(secret);
            plugin.setHttpAuth(httpAuth);
            plugin.setAllowedIPs(StringUtils.stringToCollection(allowedIPs));
            plugin.setCustomAuthFiIterClassName(customAuthFilterClassName);
            
            if(is2Reload) {
                String pluginName  = pluginManager.getName(plugin);
                String pluginDir = pluginManager.getPluginDirectory(plugin).getName();
                pluginManager.reloadPlugin(pluginDir);
            
                // Log the event
                admin.logEvent("reloaded plugin "+ pluginName, null);
                response.sendRedirect("/plugin-admin.jsp?reloadsuccess=true");
            }
            response.sendRedirect("rest-api.jsp?success=true&msg=Chat API properties edited successfully");
            return;
        }
    }

    secret = plugin.getSecret();
    permission = plugin.getPermission();    
    enabled = plugin.isEnabled();
    emailEnabled = plugin.isEmailEnabled();
    smsEnabled = plugin.isSmsEnabled();    
    smsProvider = plugin.getSmsProvider();
    adhocEnabled = plugin.isAdhocEnabled();    
    swaggerSecure = plugin.isSwaggerSecure();    
    httpAuth = plugin.getHttpAuth();
    allowedIPs = StringUtils.collectionToString(plugin.getAllowedIPs());
    customAuthFilterClassName = plugin.getCustomAuthFilterClassName();
%>

<html>
<head>
<title>Chat API Properties</title>
<meta name="pageID" content="rest-api" />
</head>
<body>

    <p>Use the form below to enable or disable the Chat API and
        configure the authentication.</p>

    <%
        if (success) {
    %>

    <div class="jive-success">
        <table cellpadding="0" cellspacing="0" border="0">
            <tbody>
                <tr>
                    <td class="jive-icon"><img src="images/success-16x16.gif"
                        width="16" height="16" border="0"></td>
                    <td class="jive-icon-label"><%= msg %></td>
                </tr>
            </tbody>
        </table>
    </div>
    <br>
    <%
        }
    %>
    
    <%  
        if (errors.get("loadingStatus") != null) { 
    %>
    <div class="jive-error">
        <table cellpadding="0" cellspacing="0" border="0">
            <tbody>
                <tr>
                    <td class="jive-icon"><img src="images/error-16x16.gif"
                        width="16" height="16" border="0"></td>
                    <td class="jive-icon-label"><%= loadingStatus %></td>
                </tr>
            </tbody>
        </table>
    </div>
    <br>
    <%
        }
    %>
    <form action="rest-api.jsp?save" method="post">

        <div class="jive-contentBoxHeader">
            Chat API Settings
        </div>
        <div class="jive-contentBox">
            <div>
                <p>
                    The Chat API can be secured with a shared secret key defined below
                    or a with HTTP basic authentication.<br />Moreover, for extra
                    security you can specify the list of IP addresses that are allowed
                    to use this service.<br />An empty list means that the service can
                    be accessed from any location. Addresses are delimited by commas.
                </p>
                <ul>
                    <input type="radio" name="enabled" value="true" id="rb01"
                        <%=((enabled) ? "checked" : "")%>>
                    <label for="rb01"><b>Enabled</b> - Chat API requests will
                        be processed.</label>
                    <br>
                    <input type="radio" name="enabled" value="false" id="rb02"
                        <%=((!enabled) ? "checked" : "")%>>
                    <label for="rb02"><b>Disabled</b> - Chat API requests will
                        be ignored.</label>
                    <br>
                    <br>

                    <input type="radio" name="authtype" value="basic"
                        id="http_basic_auth" <%=("basic".equals(httpAuth) ? "checked" : "")%>>
                    <label for="http_basic_auth">HTTP basic auth - Chat API
                        authentication with Openfire admin account.</label>
                    <br>
                    <input type="radio" name="authtype" value="secret"
                        id="secretKeyAuth" <%=("secret".equals(httpAuth) ? "checked" : "")%>>
                    <label for="secretKeyAuth">Secret key auth - Chat API
                        authentication over specified secret key.</label>
                    <br>
                    <label style="padding-left: 25px" for="text_secret">Secret
                        key:</label>
                    <input type="text" name="secret" value="<%=secret%>"
                        id="text_secret">
                    <br>                    
                    <label style="padding-left: 25px" for="text_permission">Permission
                        key:</label>
                    <input type="text" name="permission" value="<%=permission%>"
                        id="text_permission">
                    <br>
                    <input type="radio" name="authtype" value="custom"
                        id="customFilterAuth" <%=("custom".equals(httpAuth) ? "checked" : "")%>>
                    <label for="secretKeyAuth">Custom authentication filter classname - Chat API
                        authentication delegates to a custom filter implemented in some other plugin.
                    </label>
                    <div style="margin-left: 20px; margin-top: 5px;"><strong>Note: changing back and forth from custom authentication filter forces the Chat API plugin reloading</strong></div>
                    <label style="padding-left: 25px" for="text_secret">Filter 
                        classname:</label>
                    <input type="text" name="customAuthFilterClassName" value="<%= customAuthFilterClassName %>"
                        id="custom_auth_filter_class_name" style="width:70%;padding:4px;">
                    <br>
                    <br>

                    <label for="allowedIPs">Allowed IP Addresses:</label>
                    <textarea name="allowedIPs" cols="40" rows="3" wrap="virtual"><%=((allowedIPs != null) ? allowedIPs : "")%></textarea>
                    <br>
                    <br>

                    <input type="checkbox" name="emailEnabled"<%= emailEnabled ? " checked" : "" %>>Email Routing   
                    <br>                    
                    <input type="checkbox" name="smsEnabled"<%= smsEnabled ? " checked" : "" %>>SMS Routing enabled using &nbsp;
                    <select size="1" name="smsProvider" />
                         <option value="mexmo" <%= smsProvider.equals("mexmo") ? "selected" : "" %>>Mexmo</option>
                    </select>                    
                    <br>
                    <input type="checkbox" name="adhocEnabled"<%= adhocEnabled ? " checked" : "" %>>Adhoc Commands via Admin User enabled
                    <br>   
                    <input type="checkbox" name="swaggerSecure"<%= swaggerSecure ? " checked" : "" %>>Use secure port for Swagger
                    <br>                      
                   
                </ul>

                <p>You can find here swagger ui documentation for the Chat API: 
                    <a
                        href="/plugins/ofchat/swagger-ui-sandbox.jsp">REST
                        API Documentation</a>
                </p>
            </div>
            <br> <br> <input type="submit" value="Save Settings">            
        </div>
    </form>

    <form action="rest-api.jsp?certificates" method="post">

        <div class="jive-contentBoxHeader">
            Client Certificates
        </div>
        <div class="jive-contentBox">
            <p>
                The Chat API can generate client certificates for secured mutual authentication (MTLS) with openfire.
                The certicates are created and saved in folders and downloaded on request from there by the Chat API.
                This task is runs in the background by sysadmin to import them into the truststore and client.trustore.
                The server or http-bind service should be restarted afterwards.                
            </p>        
            <br> <br> <input type="submit" value="Refresh">           
        </div>
    </form>        
</body>
</html>