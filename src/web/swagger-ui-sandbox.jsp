<%--
  - $Revision$
  - $Date$
  -
  - Copyright (C) 2004-2008 Jive Software. All rights reserved.
  -
  - Licensed under the Apache License, Version 2.0 (the "License");
  - you may not use this file except in compliance with the License.
  - You may obtain a copy of the License at
  -
  -     http://www.apache.org/licenses/LICENSE-2.0
  -
  - Unless required by applicable law or agreed to in writing, software
  - distributed under the License is distributed on an "AS IS" BASIS,
  - WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  - See the License for the specific language governing permissions and
  - limitations under the License.
--%>

<%@ page import="org.jivesoftware.util.*,
         org.jivesoftware.openfire.*,
                 java.util.*,
                 java.net.URLEncoder"                 
    errorPage="error.jsp"
%>
<%@ page import="org.xmpp.packet.JID" %>

<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c"%>
<%@ taglib uri="http://java.sun.com/jstl/fmt_rt" prefix="fmt" %>
<jsp:useBean id="webManager" class="org.jivesoftware.util.WebManager"  />
<% 
    webManager.init(request, response, session, application, out ); 
    
    String hostname = JiveGlobals.getProperty("network.interface", XMPPServer.getInstance().getServerInfo().getHostname());
    String port = JiveGlobals.getBooleanProperty("ofchat.swagger.secure", false) ? JiveGlobals.getProperty("httpbind.port.secure", "7443") : JiveGlobals.getProperty("httpbind.port.plain", "7070");
    String protocol = JiveGlobals.getBooleanProperty("ofchat.swagger.secure", false) ? "https://" : "http://";
    
    String url = JiveGlobals.getProperty("ofmeet.root.url.secure", protocol + hostname + ":" + port) + "/swagger";    
%>

<html>
<head>
<title><fmt:message key="admin.sidebar.webclients.item.swagger.description" /></title>
<meta name="pageID" content="swagger-ui"/>
<style type="text/css">
    #jive-main table, #jive-main-content {
        height: 92%;
    }
</style>
</head>
<body>
<iframe frameborder='0' style='border:0px; border-width:0px; margin-left: 0px; margin-top: 0px; margin-right: 0px; margin-bottom: 0px; width:100%;height:100%;' src='<%= url %>'></iframe>
</body>
</html>
