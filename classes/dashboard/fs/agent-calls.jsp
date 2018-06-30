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
<%@ page import="org.dom4j.*" %>
<%@ page import="org.jivesoftware.openfire.plugin.rest.RESTServicePlugin" %>

<%
    String xml = "";
    Element result = null;
    int lines = 0;  
    
    ArrayList<String> agents = new ArrayList<String>();      
    ArrayList<String> agentStatus = new ArrayList<String>();   
    
    if (RESTServicePlugin.getInstance() != null)
    {               
        List<String> respCalls = RESTServicePlugin.getInstance().sendFWCommand("show calls as xml");
        List<String> respAgents = RESTServicePlugin.getInstance().sendFWCommand("callcenter_config agent list");          
        
        if (respCalls != null && respAgents != null)
        {
            int count = 0;            

            for (String line : respAgents) 
            {
                if (line.startsWith("+OK") == false)
                {
                    String[] columns = line.split("\\|");

                    for (int i=0; i<columns.length; i++)
                    {
                        if (count > 0)
                        {
                            if (columns[0].contains("@"))
                            {
                                agents.add(columns[0].split("@")[0]);
                                agentStatus.add(columns[5]);
                             }
                        }
                    }
                    count++;                    
                }
            }        
            
            for (String line : respCalls) 
            {
                xml = xml + line;
            }

            Document document = DocumentHelper.parseText(xml);
            result = document.getRootElement();

            try {
                lines = Integer.parseInt(result.attributeValue("row_count"));   
            } catch (Exception e) {}
        }
        
    }
%>
<html>
<head>
    <title>FreeSwitch Calls</title>
    <link rel="stylesheet" type="text/css" href="global.css">
</head>
<body>
<%  if (request.getParameter("deletesuccess") != null) { %>

    <div class="jive-success">
    <table cellpadding="0" cellspacing="0" border="0">
    <tbody>
        <tr><td class="jive-icon"><img src="images/success-16x16.gif" width="16" height="16" border="0" alt=""></td>
        <td class="jive-icon-label">
        Call Cleared
        </td></tr>
    </tbody>
    </table>
    </div><br>

<%  } %>
<p>
<h1>Call Center Agents</h1>
</p>

<div class="jive-table">
<table cellpadding="0" cellspacing="0" border="0" width="100%">
<thead>
    <tr>
        <th>Call Id</th>
        <th nowrap>Name</th>           
        <th nowrap>Presence Status</th>   
        <th nowrap>Call Details</th>    
        <th nowrap>Clear</th>          
    </tr>
</thead>
<tbody>

<% 
        if (lines == 0) {
%>
    <tr>
        <td align="center" colspan="10">
            There are no active calls
        </td>
    </tr>

<%
        }
    
    if (result != null)
    {
        String uuid = "&nbsp;";    
        String dest = "&nbsp;";
        String presence_id = "&nbsp;";  


        Iterator rows = result.elementIterator("row");
        int count = 0;  

        while (rows.hasNext()) 
        {
            Element row = (Element) rows.next(); 

            if (row.element("uuid") != null) 
            {
                uuid = row.elementTextTrim("uuid");
            }
            
            if (row.element("dest") != null) 
            {
                dest = row.elementTextTrim("dest");
            }

            if (row.element("presence_id") != null) 
            {
                presence_id = row.elementTextTrim("presence_id");
            }   
            
            String agent = presence_id.split("@")[0];
            int pos = agents.indexOf(agent);
            
            if (pos > -1)
            {
%>
                <tr class="jive-<%= (((count%2)==0) ? "even" : "odd") %>">
                <td width="35%">
                    <%= uuid %>
                </td>
                <td width="20%" align="left">
                    <%= agent + "@default" %>           
                </td>  
                <td width="20%" align="left">
                    <%= agentStatus.get(pos) %>           
                </td>                  
                <td width="20%" align="left">
                    <%= dest %>           
                </td>     
                <td width="5%" align="center" style="border-right:1px #ccc solid;">
                    <a href="agent-clear-call.jsp?callid=<%= URLEncoder.encode(uuid, "UTF-8") %>" title="Clear Call"><img src="images/delete-16x16.gif" width="16" height="16" border="0" alt=""></a>
                </td>       
                </tr>
<%
                count++;
            }
        }
    }
%>
</tbody>
</table>
</div>
</body>
</html>
