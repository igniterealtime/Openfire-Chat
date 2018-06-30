<%@ page import="org.jivesoftware.util.*, java.util.*, java.net.URLEncoder" errorPage="error.jsp"%>
<%@ page import="org.xmpp.packet.JID" %>

<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>
<jsp:useBean id="webManager" class="org.jivesoftware.util.WebManager"  />
<% webManager.init(request, response, session, application, out ); %>

<% 
    List<String> properties = JiveGlobals.getPropertyNames();
    int appCount = 0;
    
    for (String propertyName : properties) 
    {
        if (propertyName.indexOf("uport.clientid.") == 0) {
            appCount++;
        }
    }
%>
<html>
    <head>
        <title><fmt:message key="config.page.uport.summary.title"/></title>
        <meta name="pageID" content="uport-summary"/>
    </head>
    <body>

<p>
<fmt:message key="client.summary" />
</p>

<%  if (request.getParameter("deletesuccess") != null) { %>

    <div class="jive-success">
    <table cellpadding="0" cellspacing="0" border="0">
    <tbody>
        <tr><td class="jive-icon"><img src="images/success-16x16.gif" width="16" height="16" border="0" alt=""></td>
        <td class="jive-icon-label">
        <fmt:message key="client.expired" />
        </td></tr>
    </tbody>
    </table>
    </div><br>

<%  } %>

<p>
<fmt:message key="summary.applications" />: <%= appCount %>,
</p>

<div class="jive-table">
<table cellpadding="0" cellspacing="0" border="0" width="100%">
<thead>
    <tr>
        <th>&nbsp;</th>
        <th nowrap><fmt:message key="summary.application" /></th>        
        <th nowrap><fmt:message key="summary.clientid" /></th>
        <th nowrap><fmt:message key="summary.signer" /></th>
        <th nowrap><fmt:message key="summary.expire" /></th>              
    </tr>
</thead>
<tbody>

<% 
    if (appCount == 0) {
%>
    <tr>
        <td align="center" colspan="10">
            <fmt:message key="summary.no.applications" />
        </td>
    </tr>

<%
    }
    int i = 0;

    for (String propertyName : properties) 
    {
        if (propertyName.indexOf("uport.clientid.") == 0) 
        {    
            String clientId = propertyName.substring(15);
            String appName = "";
            int pos = clientId.indexOf(".");
            
            if (pos > -1)
            {
                appName = clientId.substring(0, pos);
                clientId = clientId.substring(pos + 1);                
            }
            
            i++;
%>
            <tr class="jive-<%= (((i%2)==0) ? "even" : "odd") %>">
                <td width="3%">
                    <%= i %>
                </td>
                <td width="5%" valign="middle">
                <%= appName %>
                </td>
                <td width="20%" align="left">
                    <%= clientId %>
                </td>
                <td width="20%" align="left">
                    <%= JiveGlobals.getProperty(propertyName) %>
                </td>     
                <td width="1%" align="center" style="border-right:1px #ccc solid;">
                    <a href="uport-expire.jsp?clientId=<%= URLEncoder.encode(propertyName, "UTF-8") %>" title="<fmt:message key="summary.expire" />">
                        <img src="images/delete-16x16.gif" width="16" height="16" border="0" alt="">
                    </a>
                </td>
            </tr>
<%        
        }
   }
%>
</tbody>
</table>
</div>
</body>
</html>
