<%@ page import="org.jivesoftware.util.*, java.net.URLEncoder" errorPage="error.jsp"%>

<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>
<jsp:useBean id="webManager" class="org.jivesoftware.util.WebManager" />
<% webManager.init(request, response, session, application, out ); %>

<% 
        String clientId = ParamUtils.getParameter(request,"clientId");
    
        if (JiveGlobals.getProperty(clientId) != null) 
        {           
            JiveGlobals.deleteProperty(clientId);
        }
        // Done, so redirect
        response.sendRedirect("uport-summary.jsp?deletesuccess=true");
        return;
%>