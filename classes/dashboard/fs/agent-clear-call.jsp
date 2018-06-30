<%--
  - $Revision: 10204 $
  - $Date: 2008-04-11 18:44:25 -0400 (Fri, 11 Apr 2008) $
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
        org.jivesoftware.openfire.plugin.rest.RESTServicePlugin,
                java.net.URLEncoder"
    errorPage="error.jsp"
%>

<% 
    try {   
        String callId = ParamUtils.getParameter(request,"callid");
        
        if (RESTServicePlugin.getInstance() != null)
        {       
            RESTServicePlugin.getInstance().sendFWCommand("uuid_kill " + callId);
                response.sendRedirect("agent-calls.jsp?deletesuccess=true");      
            } else {
                response.sendRedirect("agent-calls.jsp?deletesuccess=false");         
            }
            
    } catch (Exception e) {
            response.sendRedirect("agent-calls.jsp?deletesuccess=false"); 
    }

        return;
%>