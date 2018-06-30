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
                 java.net.URLDecoder"                 
    errorPage="error.jsp"
%>
<%@ page import="org.dom4j.*" %>
<%@ page import="org.jivesoftware.openfire.plugin.rest.RESTServicePlugin" %>
<%
    String xml = "";    
    int lines = 0;
    Document document = null;
    
    if (RESTServicePlugin.getInstance() != null)
    {
        List<String> resp = RESTServicePlugin.getInstance().sendFWCommand("conference xml_list");
        
        if (resp != null)
        {
            for (String line : resp) 
            {
                xml = xml + line;
            }

            document = DocumentHelper.parseText(xml);
            Element result = document.getRootElement();

            Iterator conferences = result.elementIterator("conference");
            int count = 0;

            while (conferences.hasNext()) 
            {
                Element conference = (Element) conferences.next();      
                lines++;
            }
        }
    }
%>
<html>
<head>
    <title>FreeSwitch Conferences</title>
    <link rel="stylesheet" type="text/css" href="global.css">
</head>
<body>
<p>FreeSwitch Conferences</p>
<div class="jive-table">
<table cellpadding="0" cellspacing="0" border="0" width="100%">
<thead>
    <tr>
        <th>Conference Id</th>
        <th nowrap>Count</th>    
        <th nowrap>Participants</th>              
        <th nowrap>Recording Path</th>            
        <th nowrap>Rate</th>
        <th nowrap>Running</th>           
    </tr>
</thead>
<tbody>

<% 
        if (lines == 0) {
%>
    <tr>
        <td align="center" colspan="10">
            There are no active conferences
        </td>
    </tr>

<%
        }
        
    if (document != null)
    {       
        Element result = document.getRootElement();

        Iterator conferences = result.elementIterator("conference");
        int count = 0;

        while (conferences.hasNext()) 
        {
            Element conference = (Element) conferences.next(); 

            String name = conference.attributeValue("name");
            String memberCount = conference.attributeValue("member-count");
            String rate = conference.attributeValue("rate");
            String running = conference.attributeValue("running");  
            String participants = "";
            String recordPath = "";
            
            Iterator members = conference.element("members").elementIterator("member"); 
            
            while (members.hasNext()) 
            {
                Element member = (Element) members.next(); 
                String memberId = "";
                String callerIdName = "";               
                String callerIdNumber = "";
                String canHear = "";
                String canSpeak = "";               

                if (member.element("flags") != null) 
                {
                    Element flags = member.element("flags");                    
                    
                    if (flags.element("can_hear") != null) 
                    {                                       
                        canHear = "true".equals(URLDecoder.decode(flags.elementTextTrim("can_hear"), "UTF-8")) ? " Hear" : " No-Hear";
                    }
                    
                    if (flags.element("can_speak") != null) 
                    {                                       
                        canSpeak = "true".equals(URLDecoder.decode(flags.elementTextTrim("can_speak"), "UTF-8")) ? " Speak" : " No-Speak";
                    }                   
                }

                if (member.element("record_path") != null) 
                {
                    recordPath = URLDecoder.decode(member.elementTextTrim("record_path"), "UTF-8");
                }
                
                if (member.element("id") != null) 
                {
                    memberId = URLDecoder.decode(member.elementTextTrim("id"), "UTF-8");
                }
                
                if (member.element("caller_id_name") != null) 
                {
                    callerIdName = URLDecoder.decode(member.elementTextTrim("caller_id_name"), "UTF-8");
                }
                
                if (member.element("caller_id_number") != null) 
                {
                    callerIdNumber = URLDecoder.decode(member.elementTextTrim("caller_id_number"), "UTF-8");
                }
                
                if ("".equals(callerIdName) == false && "".equals(callerIdNumber) == false)
                {
                    participants = participants + memberId + "&nbsp;" + callerIdName + "&nbsp;" + callerIdNumber + canHear + "&nbsp;" + canSpeak + "<br/>";
                }
            }
%>
            <tr class="jive-<%= (((count%2)==0) ? "even" : "odd") %>">
            <td width="10%">
                <%= name %>
            </td>
            <td width="10%">
                <%= memberCount %>
            </td>
            <td width="40%">
                <%= participants %>
            </td>           
            <td width="30%">
                <%= recordPath %>           
            </td>
            <td width="5%">
                <%= rate %>           
            </td>           
            <td width="5%">
                <%= running %>           
            </td>   
            </tr>
<%
            count++;
        }
    }
%>
</tbody>
</table>
</div>
</body>
</html>
