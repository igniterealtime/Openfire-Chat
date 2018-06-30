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
                 java.util.*,
                 java.net.URLEncoder"                 
    errorPage="error.jsp"
%>
<%@ page import="org.jivesoftware.openfire.plugin.rest.RESTServicePlugin" %>

<html>
    <head>
        <title>FreeSwitch Overview</title>
        <link rel="stylesheet" type="text/css" href="global.css">        
    </head>
    <body>

<pre>
<%
    if (JiveGlobals.getBooleanProperty("freeswitch.enabled", true))
    {
        if (RESTServicePlugin.getInstance() != null)
        {   
            List<String> overviewLines = RESTServicePlugin.getInstance().sendFWCommand("banner");

            if (overviewLines != null)
            {
                for (String line : overviewLines) 
                {
                    %><div style="font-family: Courier New,Courier,Lucida Sans Typewriter,Lucida Typewriter,monospace!important;"><%= line %></div><%
                }
                
                overviewLines = RESTServicePlugin.getInstance().sendFWCommand("sofia status");

                for (String line : overviewLines) 
                {
                    %><div style="font-family: Courier New,Courier,Lucida Sans Typewriter,Lucida Typewriter,monospace!important;"><%= line %></div><%
                }
                
                overviewLines = RESTServicePlugin.getInstance().sendFWCommand("version");

                for (String line : overviewLines) 
                {
                    %><p style="font-family: Courier New,Courier,Lucida Sans Typewriter,Lucida Typewriter,monospace!important;"><%= line %></p><%
                }
                
                
            } else {

                %>Please wait.......<%
            }
        }
        
    } else {
        %>Disabled<%            
    }       
%>
</pre>
</body>
</html>
