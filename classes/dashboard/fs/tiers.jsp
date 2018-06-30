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
    <title>Call Center Mappings</title>
    <link rel="stylesheet" type="text/css" href="global.css">
</head>
<body>
<div class="jive-table">
<table cellpadding="0" cellspacing="0" border="0" width="100%">
<%
    if (RESTServicePlugin.getInstance() != null)
    {   
        List<String> resp = RESTServicePlugin.getInstance().sendFWCommand("callcenter_config tier list");
        
        if (resp != null)
        {
            int count = 0;

            for (String line : resp) 
            {
                if (line.startsWith("+OK") == false)
                {           
                    String[] columns = line.split("\\|");

                    %><tr class="jive-<%= (((count%2)==0) ? "even" : "odd") %>"><%

                    for (int i=0; i<columns.length; i++)
                    {
                        String tagName = (count == 0 ? "th" : "td");
                        String tagValue = (count == 0 ? columns[i].substring(0, 1).toUpperCase() + columns[i].substring(1) : columns[i]);

                        %><<%= tagName %>><%= tagValue %></<%= tagName %>><%
                    }

                    %></tr><%           
                    count++;
                }
            }
        } else {
            
            if (JiveGlobals.getBooleanProperty("freeswitch.enabled", true))
            {
                %>Please wait.......<%
            } else {
                %>Disabled<%            
            }
        }
    }
%>
</table>
</div>
</body>
</html>
