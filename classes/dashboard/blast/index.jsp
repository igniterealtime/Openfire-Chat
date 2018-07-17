<%@ page import="org.jivesoftware.util.*, org.jivesoftware.openfire.user.*, org.jivesoftware.openfire.*, org.dom4j.*, java.net.*,
                 org.jivesoftware.openfire.vcard.VCardManager, java.util.*, java.net.URLEncoder, javax.xml.bind.DatatypeConverter"%>
<%
    String hostname = XMPPServer.getInstance().getServerInfo().getHostname();    
    String ourIpAddress = hostname;

    try {
        ourIpAddress = InetAddress.getByName(hostname).getHostAddress();
    } catch (Exception e) {  }
        
    String domain = XMPPServer.getInstance().getServerInfo().getXMPPDomain();
    
    boolean isSwitchAvailable = JiveGlobals.getBooleanProperty("freeswitch.enabled", false);
    String sipDomain = JiveGlobals.getProperty("freeswitch.sip.hostname", ourIpAddress);
    
    String emailAddress = null;
    String nickName = null;  
    String userAvatar = null;
    String[] userPass = null;
    
    String authorization = request.getHeader("authorization");
    
    if (authorization != null)
    {
        authorization = authorization.replaceFirst("[B|b]asic ", "");
        byte[] decodedBytes = DatatypeConverter.parseBase64Binary(authorization);

        if (decodedBytes != null && decodedBytes.length > 0) 
        {
            userPass = new String(decodedBytes).split(":", 2);

            try {
                User user = XMPPServer.getInstance().getUserManager().getUser(userPass[0]);

                emailAddress = user.getEmail();
                nickName = user.getName();

                VCardManager vcardManager = VCardManager.getInstance();
                Element vcard = vcardManager.getVCard(userPass[0]);

                if (vcard != null)
                {
                    Element photo = vcard.element("PHOTO");

                    if (photo != null)
                    {
                        String type = photo.element("TYPE").getText();
                        String binval = photo.element("BINVAL").getText();

                        userAvatar = "data:" + type + ";base64," + binval.replace("\n", "").replace("\r", "");
                    }
                }            

            } catch (Exception e) {

            }        
        }
    }
  
%><!DOCTYPE html>
<html>
<head>
<title>Message Blast</title>

<meta http-equiv="X-UA-Compatible" content="IE=EDGE" />
<meta http-equiv="Content-type" content="text/html; charset=utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<script>
    var config = {
        username:<%= authorization == null ? null : "'" + userPass[0] + "'" %>,     
        emailAddress:<%= emailAddress == null ? null : "'" + emailAddress + "'" %>,
        nickName:<%= nickName == null ? null : "'" + nickName + "'" %>,
        userAvatar:<%= userAvatar == null ? null : "'" + userAvatar + "'" %>,            
        authorization: <%= authorization == null ? null : "'" + authorization + "'" %>,                
        hostname:'<%= hostname %>',             
        domain:'<%= domain %>'
    };
</script> 

<script src="vendor_js/jspdf.min.js"></script>
<link id="favicon" rel="icon" href="favicon.ico">
<link rel="stylesheet" href="css/fabric.min.css" />
<link rel="stylesheet" href="css/fabric.components.min.css" />
<link rel="stylesheet" href="vendor_js/mediumeditor/css/medium-editor.css">
<link rel="stylesheet" href="vendor_js/mediumeditor/css/themes/bootstrap.css">
<link rel="stylesheet" href="css/tl_blast.css">

<script src="vendor_js/fabric.min.js"></script>
<script src="vendor_js/jquery.js"></script>
<script src="vendor_js/PickaDate.js"></script>
<script type="text/javascript" src="vendor_js/cron/jquery-cron.js"></script>

<script src="js/tl_message_blast.js" defer></script>
<script src="js/tl_message_blast.request.js"></script>
<script src="js/tl_message_blast.settings.js"></script>
<script src="js/tl_message_blast.inbox.js"></script>
<script src="js/tl_message_blast.newblast.js"></script>
<script src="js/tl_message_blast.pending.js"></script>
<script src="js/tl_message_blast.fileuploader.js"></script>
<script src="js/tl_message_blast.attachment.js"></script>
<script src="js/tl_message_blast.sent.js"></script>


<script src="vendor_js/mediumeditor/js/medium-editor.js"></script>
<script src="vendor_js/charts/Chart.min.js"></script>
<script src="vendor_js/charts/Chart.bundle.min.js"></script>
<body>

<div class="ms-Pivot ms-Pivot--large ms-Pivot--tabs">
  <ul class="ms-Pivot-links">
    <li class="ms-Pivot-link is-selected" data-content="newmessage" title="New Blast" tabindex="1">
      New Blast
    </li>
    <li class="ms-Pivot-link " data-content="sentmessages" title="Sent Blasts" tabindex="1">
      Sent Blasts
    </li>
    <li class="ms-Pivot-link " data-content="pendingmessages" title="Pending Blasts" tabindex="1">
      Pending Blasts
    </li>
    <li id="helpbutton" class="ms-Pivot-link" tabindex="1">
      Help
      <i class="ms-Pivot-ellipsis ms-Icon ms-Icon--More"></i>
    </li>
    <li id="settingsbutton" class="ms-Pivot-link" tabindex="1">
      Settings
      <i class="ms-Pivot-ellipsis ms-Icon ms-Icon--More"></i>
    </li>
  </ul>



  <div class="ms-Pivot-content" data-content="newmessage" style="display:block;">

        <div class="ms-SearchBox searcher">
          <input id="searchrecipients" class="ms-SearchBox-field" type="text" value="">
          <label class="ms-SearchBox-label">
            <i class="ms-SearchBox-icon ms-Icon ms-Icon--Search"></i>
            <span class="ms-SearchBox-text">Search</span>
          </label>
          <div class="ms-CommandButton ms-SearchBox-clear ms-CommandButton--noLabel">
            <button class="ms-CommandButton-button">
              <span class="ms-CommandButton-icon"><i class="ms-Icon ms-Icon--Clear"></i></span>
              <span class="ms-CommandButton-label"></span>
            </button>
          </div>
        </div>


<div class="colscontainer">

<div class="col1">
    <div class="ms-Dropdown" tabindex="0">
      <label class="ms-Label parttitle">Send as</label>
      <i class="ms-Dropdown-caretDown ms-Icon ms-Icon--ChevronDown"></i>
      <select id="usertosendas" class="ms-Dropdown-select">
        <option>Select user to send as &amp;hellip;</option>

      </select>
    </div>


     <div id="rept" class="ms-Dropdown" tabindex="0">
      <label class="ms-Label parttitle">Reply to</label>
      <i class="ms-Dropdown-caretDown ms-Icon ms-Icon--ChevronDown"></i>
      <select id="replyto" class="ms-Dropdown-select">
        <option>Select user to reply to &amp;hellip;</option>
      </select>
    </div>





    <div class="ms-TextField">
      <label class="ms-Label">Title</label>
      <input id="title" class="ms-TextField-field" type="text" value="" placeholder="">
    </div>
    <script type="text/javascript">
      var TextFieldElements = document.querySelectorAll(".ms-TextField");
      for (var i = 0; i < TextFieldElements.length; i++) {
        new fabric['TextField'](TextFieldElements[i]);
      }
    </script>

    <div id="presetmessagebuttons" class="ms-TextField ms-TextField--multiline">
      <label class="ms-Label">Message</label>
      <div id="message" class="ms-TextField-field editable"></div>
      <button id="presetmessage1_but" class="ms-Button ms-Button--small hidden">
        <span class="ms-Button-label">Preset 1</span>
      </button>
      <button id="presetmessage2_but" class="ms-Button ms-Button--small hidden">
        <span class="ms-Button-label">Preset 2</span>
      </button>
      <button id="presetmessage3_but" class="ms-Button ms-Button--small hidden">
        <span class="ms-Button-label">Preset 3</span>
      </button>
      <button id="presetmessage4_but" class="ms-Button ms-Button--small hidden">
        <span class="ms-Button-label">Preset 4</span>
      </button>
    </div>


        <br>
        <div class="ms-CheckBox" style="display:inline;">
          <input id="markascritical" tabindex="-1" type="checkbox" class="ms-CheckBox-input">
          <label role="checkbox" class="ms-CheckBox-field" tabindex="0" aria-checked="false">
            <span class="ms-Label">Mark as Critical </span>
          </label>
        </div>

          <div class="ms-CheckBox" style="display:inline;padding-left:10px;">
            <input id="enablesendlater" tabindex="-1" type="checkbox" class="ms-CheckBox-input">
            <label role="checkbox" class="ms-CheckBox-field" tabindex="0" aria-checked="false">
              <span class="ms-Label">Send later</span>
            </label>
          </div>

           <div class="ms-CheckBox padtop15" style="display:none;padding-left:10px;">
            <input id="enablehalttime" tabindex="-1" type="checkbox" class="ms-CheckBox-input">
            <label role="checkbox" class="ms-CheckBox-field" tabindex="0" aria-checked="false">
              <span class="ms-Label">Set halt date and time</span>
            </label>
          </div>

          <div class="ms-CheckBox padtop15" style="display:inline;padding-left:10px;">
            <input id="enablereoccuringsend" tabindex="-1" type="checkbox" class="ms-CheckBox-input">
            <label role="checkbox" class="ms-CheckBox-field" tabindex="0" aria-checked="false">
              <span class="ms-Label">Repeating send date</span>
            </label>
          </div>


      <div id="sendlatercontainer" class="hidden">


            <div class="dateandtime padtop15">
              <div class="ms-DatePicker">
                  <div class="ms-TextField">
                    <label class="ms-Label">Start date</label>
                    <i class="ms-DatePicker-event ms-Icon ms-Icon--Event"></i>
                    <input id="sendstart" class="ms-TextField-field" type="text" placeholder="Select a date&hellip;">
                  </div>
                  <div class="ms-DatePicker-monthComponents">
                    <span class="ms-DatePicker-nextMonth js-nextMonth"><i class="ms-Icon ms-Icon--ChevronRight"></i></span>
                    <span class="ms-DatePicker-prevMonth js-prevMonth"><i class="ms-Icon ms-Icon--ChevronLeft"></i></span>
                    <div class="ms-DatePicker-headerToggleView js-showMonthPicker"></div>
                  </div>
                  <span class="ms-DatePicker-goToday js-goToday">Go to today</span>
                  <div class="ms-DatePicker-monthPicker">
                    <div class="ms-DatePicker-header">
                      <div class="ms-DatePicker-yearComponents">
                        <span class="ms-DatePicker-nextYear js-nextYear"><i class="ms-Icon ms-Icon--ChevronRight"></i></span>
                        <span class="ms-DatePicker-prevYear js-prevYear"><i class="ms-Icon ms-Icon--ChevronLeft"></i></span>
                      </div>
                      <div class="ms-DatePicker-currentYear js-showYearPicker"></div>
                    </div>
                    <div class="ms-DatePicker-optionGrid">
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="0">Jan</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="1">Feb</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="2">Mar</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="3">Apr</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="4">May</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="5">Jun</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="6">Jul</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="7">Aug</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="8">Sep</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="9">Oct</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="10">Nov</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="11">Dec</span>
                    </div>
                  </div>
                  <div class="ms-DatePicker-yearPicker">
                    <div class="ms-DatePicker-decadeComponents">
                      <span class="ms-DatePicker-nextDecade js-nextDecade"><i class="ms-Icon ms-Icon--ChevronRight"></i></span>
                      <span class="ms-DatePicker-prevDecade js-prevDecade"><i class="ms-Icon ms-Icon--ChevronLeft"></i></span>
                    </div>
                  </div>
                </div>
                <div class="ms-Dropdown timedrop" tabindex="0">
                  <label class="ms-Label">Hours</label>
                  <i class="ms-Dropdown-caretDown ms-Icon ms-Icon--ChevronDown"></i>
                  <select id="starthours" class="ms-Dropdown-select">
                    <option>00</option>
                    <option>01</option>
                    <option>02</option>
                    <option>03</option>
                    <option>04</option>
                    <option>05</option>
                    <option>06</option>
                    <option>07</option>
                    <option>08</option>
                    <option>09</option>
                    <option>10</option>
                    <option>11</option>
                    <option>12</option>
                    <option>13</option>
                    <option>14</option>
                    <option>15</option>
                    <option>16</option>
                    <option>17</option>
                    <option>18</option>
                    <option>19</option>
                    <option>20</option>
                    <option>21</option>
                    <option>22</option>
                    <option>23</option>
                  </select>
                </div>
                <div class="ms-Dropdown timedrop" tabindex="0">
                  <label class="ms-Label">Minutes</label>
                  <i class="ms-Dropdown-caretDown ms-Icon ms-Icon--ChevronDown"></i>
                  <select id="startmins" class="ms-Dropdown-select">
                      <option>00</option>
                      <option>01</option>
                      <option>02</option>
                      <option>03</option>
                      <option>04</option>
                      <option>05</option>
                      <option>06</option>
                      <option>07</option>
                      <option>08</option>
                      <option>09</option>
                      <option>10</option>
                      <option>11</option>
                      <option>12</option>
                      <option>13</option>
                      <option>14</option>
                      <option>15</option>
                      <option>16</option>
                      <option>17</option>
                      <option>18</option>
                      <option>19</option>
                      <option>20</option>
                      <option>21</option>
                      <option>22</option>
                      <option>23</option>
                      <option>24</option>
                      <option>25</option>
                      <option>26</option>
                      <option>27</option>
                      <option>28</option>
                      <option>29</option>
                      <option>30</option>
                      <option>31</option>
                      <option>32</option>
                      <option>33</option>
                      <option>34</option>
                      <option>35</option>
                      <option>36</option>
                      <option>37</option>
                      <option>38</option>
                      <option>39</option>
                      <option>40</option>
                      <option>41</option>
                      <option>42</option>
                      <option>43</option>
                      <option>44</option>
                      <option>45</option>
                      <option>46</option>
                      <option>47</option>
                      <option>48</option>
                      <option>49</option>
                      <option>50</option>
                      <option>51</option>
                      <option>52</option>
                      <option>53</option>
                      <option>54</option>
                      <option>55</option>
                      <option>56</option>
                      <option>57</option>
                      <option>58</option>
                      <option>59</option>
                  </select>
                </div>
            </div>

          </div>

        <div id="reoccuringcontainer" class="hidden">


          <label class="ms-Label parttitle padtop15">Repeating send date</label>
          <div>
             <div id='reoccuringdate' ></div>
             <!-- <p>Generated cron entry: <span class='example-text' id='example1-val'></span></p> -->
             <input id="cronvalue" type="hidden" name="country" value="">
          </div>

          <div class="ms-CheckBox padtop15">
            <input id="enablerepeatinghalttime" tabindex="-1" type="checkbox" class="ms-CheckBox-input">
            <label role="checkbox" class="ms-CheckBox-field" tabindex="0" aria-checked="false" name="checkboxa">
              <span class="ms-Label parttitle padtop15">Repeating stop date</span>
            </label>
          </div>



          <div id="reoccuringhaltcontainer" class="hidden">
             <!-- <div id='reoccuringstopdate' ></div>
             <input id="cronstopvalue" type="hidden" name="country" value=""> -->
                      <div class="dateandtime padtop15">
              <div class="ms-DatePicker">
                  <div class="ms-TextField">
                    <label class="ms-Label">Repeating stop date</label>
                    <i class="ms-DatePicker-event ms-Icon ms-Icon--Event"></i>
                    <input id="repeatingsendstop" class="ms-TextField-field" type="text" placeholder="Select a date&hellip;">
                  </div>
                  <div class="ms-DatePicker-monthComponents">
                    <span class="ms-DatePicker-nextMonth js-nextMonth"><i class="ms-Icon ms-Icon--ChevronRight"></i></span>
                    <span class="ms-DatePicker-prevMonth js-prevMonth"><i class="ms-Icon ms-Icon--ChevronLeft"></i></span>
                    <div class="ms-DatePicker-headerToggleView js-showMonthPicker"></div>
                  </div>
                  <span class="ms-DatePicker-goToday js-goToday">Go to today</span>
                  <div class="ms-DatePicker-monthPicker">
                    <div class="ms-DatePicker-header">
                      <div class="ms-DatePicker-yearComponents">
                        <span class="ms-DatePicker-nextYear js-nextYear"><i class="ms-Icon ms-Icon--ChevronRight"></i></span>
                        <span class="ms-DatePicker-prevYear js-prevYear"><i class="ms-Icon ms-Icon--ChevronLeft"></i></span>
                      </div>
                      <div class="ms-DatePicker-currentYear js-showYearPicker"></div>
                    </div>
                    <div class="ms-DatePicker-optionGrid">
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="0">Jan</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="1">Feb</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="2">Mar</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="3">Apr</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="4">May</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="5">Jun</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="6">Jul</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="7">Aug</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="8">Sep</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="9">Oct</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="10">Nov</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="11">Dec</span>
                    </div>
                  </div>
                  <div class="ms-DatePicker-yearPicker">
                    <div class="ms-DatePicker-decadeComponents">
                      <span class="ms-DatePicker-nextDecade js-nextDecade"><i class="ms-Icon ms-Icon--ChevronRight"></i></span>
                      <span class="ms-DatePicker-prevDecade js-prevDecade"><i class="ms-Icon ms-Icon--ChevronLeft"></i></span>
                    </div>
                  </div>
                </div>
                <div class="ms-Dropdown timedrop" tabindex="0">
                  <label class="ms-Label">Hours</label>
                  <i class="ms-Dropdown-caretDown ms-Icon ms-Icon--ChevronDown"></i>
                  <select id="repeatingstophours" class="ms-Dropdown-select">
                    <option>00</option>
                    <option>01</option>
                    <option>02</option>
                    <option>03</option>
                    <option>04</option>
                    <option>05</option>
                    <option>06</option>
                    <option>07</option>
                    <option>08</option>
                    <option>09</option>
                    <option>10</option>
                    <option>11</option>
                    <option>12</option>
                    <option>13</option>
                    <option>14</option>
                    <option>15</option>
                    <option>16</option>
                    <option>17</option>
                    <option>18</option>
                    <option>19</option>
                    <option>20</option>
                    <option>21</option>
                    <option>22</option>
                    <option>23</option>
                  </select>
                </div>
                <div class="ms-Dropdown timedrop" tabindex="0">
                  <label class="ms-Label">Minutes</label>
                  <i class="ms-Dropdown-caretDown ms-Icon ms-Icon--ChevronDown"></i>
                  <select id="repeatingstopmins" class="ms-Dropdown-select">
                      <option>00</option>
                      <option>01</option>
                      <option>02</option>
                      <option>03</option>
                      <option>04</option>
                      <option>05</option>
                      <option>06</option>
                      <option>07</option>
                      <option>08</option>
                      <option>09</option>
                      <option>10</option>
                      <option>11</option>
                      <option>12</option>
                      <option>13</option>
                      <option>14</option>
                      <option>15</option>
                      <option>16</option>
                      <option>17</option>
                      <option>18</option>
                      <option>19</option>
                      <option>20</option>
                      <option>21</option>
                      <option>22</option>
                      <option>23</option>
                      <option>24</option>
                      <option>25</option>
                      <option>26</option>
                      <option>27</option>
                      <option>28</option>
                      <option>29</option>
                      <option>30</option>
                      <option>31</option>
                      <option>32</option>
                      <option>33</option>
                      <option>34</option>
                      <option>35</option>
                      <option>36</option>
                      <option>37</option>
                      <option>38</option>
                      <option>39</option>
                      <option>40</option>
                      <option>41</option>
                      <option>42</option>
                      <option>43</option>
                      <option>44</option>
                      <option>45</option>
                      <option>46</option>
                      <option>47</option>
                      <option>48</option>
                      <option>49</option>
                      <option>50</option>
                      <option>51</option>
                      <option>52</option>
                      <option>53</option>
                      <option>54</option>
                      <option>55</option>
                      <option>56</option>
                      <option>57</option>
                      <option>58</option>
                      <option>59</option>
                  </select>
                </div>
            </div>
          </div>



        </div>


          <div id="haltsettings" class="hidden">

               <div class="dateandtime padtop15">
              <div class="ms-DatePicker">
                  <div class="ms-TextField">
                    <label class="ms-Label">Halt send date</label>
                    <i class="ms-DatePicker-event ms-Icon ms-Icon--Event"></i>
                    <input id="sendstop" class="ms-TextField-field" type="text" placeholder="Select a date&hellip;">
                  </div>
                  <div class="ms-DatePicker-monthComponents">
                    <span class="ms-DatePicker-nextMonth js-nextMonth"><i class="ms-Icon ms-Icon--ChevronRight"></i></span>
                    <span class="ms-DatePicker-prevMonth js-prevMonth"><i class="ms-Icon ms-Icon--ChevronLeft"></i></span>
                    <div class="ms-DatePicker-headerToggleView js-showMonthPicker"></div>
                  </div>
                  <span class="ms-DatePicker-goToday js-goToday">Go to today</span>
                  <div class="ms-DatePicker-monthPicker">
                    <div class="ms-DatePicker-header">
                      <div class="ms-DatePicker-yearComponents">
                        <span class="ms-DatePicker-nextYear js-nextYear"><i class="ms-Icon ms-Icon--ChevronRight"></i></span>
                        <span class="ms-DatePicker-prevYear js-prevYear"><i class="ms-Icon ms-Icon--ChevronLeft"></i></span>
                      </div>
                      <div class="ms-DatePicker-currentYear js-showYearPicker"></div>
                    </div>
                    <div class="ms-DatePicker-optionGrid">
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="0">Jan</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="1">Feb</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="2">Mar</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="3">Apr</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="4">May</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="5">Jun</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="6">Jul</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="7">Aug</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="8">Sep</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="9">Oct</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="10">Nov</span>
                      <span class="ms-DatePicker-monthOption js-changeDate" data-month="11">Dec</span>
                    </div>
                  </div>
                  <div class="ms-DatePicker-yearPicker">
                    <div class="ms-DatePicker-decadeComponents">
                      <span class="ms-DatePicker-nextDecade js-nextDecade"><i class="ms-Icon ms-Icon--ChevronRight"></i></span>
                      <span class="ms-DatePicker-prevDecade js-prevDecade"><i class="ms-Icon ms-Icon--ChevronLeft"></i></span>
                    </div>
                  </div>
                </div>
                <div class="ms-Dropdown timedrop" tabindex="0">
                  <label class="ms-Label">Hours</label>
                  <i class="ms-Dropdown-caretDown ms-Icon ms-Icon--ChevronDown"></i>
                  <select id="stophours" class="ms-Dropdown-select">
                    <option>00</option>
                    <option>01</option>
                    <option>02</option>
                    <option>03</option>
                    <option>04</option>
                    <option>05</option>
                    <option>06</option>
                    <option>07</option>
                    <option>08</option>
                    <option>09</option>
                    <option>10</option>
                    <option>11</option>
                    <option>12</option>
                    <option>13</option>
                    <option>14</option>
                    <option>15</option>
                    <option>16</option>
                    <option>17</option>
                    <option>18</option>
                    <option>19</option>
                    <option>20</option>
                    <option>21</option>
                    <option>22</option>
                    <option>23</option>
                  </select>
                </div>
                <div class="ms-Dropdown timedrop" tabindex="0">
                  <label class="ms-Label">Minutes</label>
                  <i class="ms-Dropdown-caretDown ms-Icon ms-Icon--ChevronDown"></i>
                  <select id="stopmins" class="ms-Dropdown-select">
                      <option>00</option>
                      <option>01</option>
                      <option>02</option>
                      <option>03</option>
                      <option>04</option>
                      <option>05</option>
                      <option>06</option>
                      <option>07</option>
                      <option>08</option>
                      <option>09</option>
                      <option>10</option>
                      <option>11</option>
                      <option>12</option>
                      <option>13</option>
                      <option>14</option>
                      <option>15</option>
                      <option>16</option>
                      <option>17</option>
                      <option>18</option>
                      <option>19</option>
                      <option>20</option>
                      <option>21</option>
                      <option>22</option>
                      <option>23</option>
                      <option>24</option>
                      <option>25</option>
                      <option>26</option>
                      <option>27</option>
                      <option>28</option>
                      <option>29</option>
                      <option>30</option>
                      <option>31</option>
                      <option>32</option>
                      <option>33</option>
                      <option>34</option>
                      <option>35</option>
                      <option>36</option>
                      <option>37</option>
                      <option>38</option>
                      <option>39</option>
                      <option>40</option>
                      <option>41</option>
                      <option>42</option>
                      <option>43</option>
                      <option>44</option>
                      <option>45</option>
                      <option>46</option>
                      <option>47</option>
                      <option>48</option>
                      <option>49</option>
                      <option>50</option>
                      <option>51</option>
                      <option>52</option>
                      <option>53</option>
                      <option>54</option>
                      <option>55</option>
                      <option>56</option>
                      <option>57</option>
                      <option>58</option>
                      <option>59</option>
                  </select>
                </div>
            </div>


           </div>

           <!-- <div class="ms-Dropdown" tabindex="0"> -->
              <!-- <label class="ms-Label parttitle">Start Time</label> -->
              <!-- <i class="ms-Dropdown-caretDown ms-Icon ms-Icon--ChevronDown"></i> -->
             <!--  <select id="sendstarttime" class="">
                <option>Time to start send &amp;hellip;</option>
              </select> -->


            <!-- </div> -->


          <script type="text/javascript">

            var currentdate = new Date();
            var cronformattimedateyear = "0 "+currentdate.getMinutes()+" "+currentdate.getHours()+" "+currentdate.getDate()+" "+(currentdate.getMonth()+1)+" ? *";

            document.getElementById("cronvalue").value=cronformattimedateyear;
            // document.getElementById("cronstopvalue").value=cronformattimedateyear;

            $(document).ready(function() {
              $('#reoccuringdate').cron({
                  initial: cronformattimedateyear,
                  onChange: function() {
                      $('#cronvalue').val($(this).cron("value"));
                  },
                  useGentleSelect:false
              });

              // $('#reoccuringstopdate').cron({
              //     initial: cronformattimedateyear,
              //     onChange: function() {
              //         $('#cronstopvalue').val($(this).cron("value"));
              //     },
              //     useGentleSelect:false
              // });




            });
          </script>




      <div class="ms-TextField padtop15 clear">
        <label class="ms-Label">Additional external recipients</label>
        <input class="ms-TextField-field" id="otherparticipants" type="text" value="" placeholder="Comma separated list of additional participants">

        <input type="file" class="file" id="attachement" style="display: none;"/>
        <input type="file" id="attachuploadfiles" style="display: none;" />        

         <button id="uploadcsv" class="ms-Button ms-Button--primary">
            <span class="ms-Button-label">Upload CSV</span>
          </button>
         <button id="attachupload" class="ms-Button ms-Button--primary">
            <span class="ms-Button-label">Add Attachment</span>
          </button>          
      </div>


        <div class="docs-sendblastdia-lgHeader">
          <div class="ms-Dialog ms-Dialog--lgHeader">
            <div class="ms-Dialog-title">Send Blast Message</div>
            <div class="ms-Dialog-content">
              <p class="ms-Dialog-subText">Your Blast message will be sent to all the choosen recipients immediately. Are you sure you want to send?</p>
            </div>
            <div class="ms-Dialog-actions">
              <button class="ms-Button ms-Dialog-action ms-Button--primary" onClick="TL_MessageBlast.Newblast.sendblast()">
                <span class="ms-Button-label">Send</span>
              </button>
              <button class="ms-Button ms-Dialog-action">
                <span class="ms-Button-label">Cancel</span>
              </button>
            </div>
          </div>



          <button class="ms-Button ms-Button--primary docs-sendblastdia-button">
            <span class="ms-Button-label">Send Blast</span>
          </button>
          <button id="resetnewblast" class="ms-Button ms-Button--primary docs-sendblastdia-button">
            <span class="ms-Button-label">Reset</span>
          </button>
         <label class="docs-sendblastdia-label"></label>
        </div>

 </div>

        <div class="col2">
                 <label class="ms-Label parttitle">Recipients</label>
                    <div id="participantpicker">
                     <!--  <dl>
                        <dt>
                          <input type="checkbox" id="option"><label for="option"> Contacts</label>
                          <dd class="ms-CheckBox">
                                <input tabindex="-1" type="checkbox" id="option" class="ms-CheckBox-input">
                                <label role="checkbox" class="ms-CheckBox-field" tabindex="0" aria-checked="false" name="checkboxa">
                                    <span class="ms-Label">Contacts</span>
                                </label>
                          </dd>
                        <dt>

                        <dd class="ms-CheckBox">
                            <input tabindex="-1" type="checkbox" class="subOption ms-CheckBox-input">
                            <label role="checkbox" class="ms-CheckBox-field" tabindex="0" aria-checked="false" name="checkboxa">
                                <span class="ms-Label">Person 1</span>
                            </label>
                        </dd>
                      </dl> -->

                    </div>

        </div>
    </div>
  </div>


    <div class="ms-Pivot-content" data-content="pendingmessages">

        <div class="ms-SearchBox searcher">
          <input id="pendingsearch" class="ms-SearchBox-field" type="text" value="">
          <label class="ms-SearchBox-label">
            <i class="ms-SearchBox-icon ms-Icon ms-Icon--Search"></i>
            <span class="ms-SearchBox-text">Search</span>
          </label>
          <div class="ms-CommandButton ms-SearchBox-clear ms-CommandButton--noLabel">
            <button class="ms-CommandButton-button">
              <span class="ms-CommandButton-icon"><i class="ms-Icon ms-Icon--Clear"></i></span>
              <span class="ms-CommandButton-label"></span>
            </button>
          </div>
        </div>


        <!-- <button onClick="TL_MessageBlast.Pending.removepending()">Remove pending blasts</button> -->
        <button onClick="TL_MessageBlast.Pending.removepending()" class="ms-Button ms-Button--hero">
          <span class="ms-Button-icon"><i class="ms-Icon ms-Icon--Delete"></i></span>
          <span class="ms-Button-label">Remove pending blasts</span>
        </button>


        <div id="pendinglist" class="scroller">
          <table class="ms-Table ms-Table--selectable">
            <thead>
              <tr>
                <th class="ms-Table-rowCheck" id="selectall"></th>
                <th>Title</th>
                <th>Message</th>
                <!-- <th>Send Later flag</th> -->
                <th>Cron job id</th>
              </tr>
            </thead>
            <tbody id="pendingmessagescontent">

<!--               <tr>
                <td class="ms-Table-rowCheck"></td>
                <td>Fire Alarm</td>
                <td>Sending</td>
                <td>Delivered 1 of 20</td>
                <td>02 June 2017</td>
              </tr> -->


            </tbody>
          </table>

        </div>



  </div>



  <div class="ms-Pivot-content" data-content="sentmessages">

        <div class="ms-SearchBox searcher">
          <input id="sentsearch" class="ms-SearchBox-field" type="text" value="">
          <label class="ms-SearchBox-label">
            <i class="ms-SearchBox-icon ms-Icon ms-Icon--Search"></i>
            <span class="ms-SearchBox-text">Search</span>
          </label>
          <div class="ms-CommandButton ms-SearchBox-clear ms-CommandButton--noLabel">
            <button class="ms-CommandButton-button">
              <span class="ms-CommandButton-icon"><i class="ms-Icon ms-Icon--Clear"></i></span>
              <span class="ms-CommandButton-label"></span>
            </button>
          </div>
        </div>

       <button id="createpdfbutton" title="Create PDF report" class="ms-Button ms-Button--hero" onClick="makepdf()">
          <span class="ms-Button-icon"><i class="ms-Icon ms-Icon--Add"></i></span>
          <span class="ms-Button-label">Create PDF</span>
        </button>

        <button onClick="TL_MessageBlast.Sent.removesent()" class="ms-Button ms-Button--hero">
          <span class="ms-Button-icon"><i class="ms-Icon ms-Icon--Delete"></i></span>
          <span class="ms-Button-label">Remove blasts</span>
        </button>

        <div id="sentinnercontain">

        <div id="sentlist" class="halfwidthscroller">
          <table class="ms-Table  ms-Table--selectable">

            <thead>
              <tr>
                <th class="ms-Table-rowCheck" id="sellectlist"></th>
                <th>Title</th>
                <th>Read</th>
                <th>Unread</th>
                <th>Resp</th>
                <th>Errors</th>


                <th>Date</th>
              </tr>
            </thead>
            <tbody id="sentmessagescontent">
  <!--
              <tr>
                <td class="ms-Table-rowCheck"></td>
                <td>Fire Alarm</td>
                <td>Sending</td>
                <td>Delivered 1 of 20</td>
                <td>02 June 2017</td>
              </tr>
  -->

            </tbody>
          </table>

        </div>

        <div id="sentincommingpanel">
          <div id="sentincommingpanelscroller" class="halfscrollerbot">
              <div id="noResponses" class="ms-ListItem-primaryText"></div>
              <div id="inboxtitle"></div>
              <!-- <ul id="inboxlist" class="ms-List">

              </ul> -->
              <table class="ms-Table ms-Table">

                <thead>
                  <tr>
                    <th>User</th><th>SIP UID</th><th>Last attempted send</th><th>Retries left</th>
                  </tr>
                </thead>
                <tbody id="inboxlist">
      <!--
                  <tr>
                    <td class="ms-Table-rowCheck"></td>
                    <td>Fire Alarm</td>
                    <td>Sending</td>
                    <td>Delivered 1 of 20</td>
                    <td>02 June 2017</td>
                  </tr>
      -->

                </tbody>
              </table>
          </div>
          <div id="sentincommingdetail" class="halfscrollerbot">
            <div id="sentdetail1" class="sentblastdetail sentblastdetailheader"></div>
            <div id="sentdetail2" class="sentblastdetail"></div>
          </div>
        </div>
        </div>


        <div id="editor"></div>
        <script type="text/javascript">
              function makepdf(){

                  var pdf = new jsPDF('portrait', 'pt', 'a4', true);
                    var source = document.createElement("div");
                    source.innerHTML="<h1>Sent Blast Report</h1>"
                    source.className="pdfstyletext"
                    var sentincommingpanel = document.getElementById('sentincommingpanel').cloneNode(true);
                    var source2 = document.getElementById('sentlist').cloneNode(true);


                    source.appendChild(sentincommingpanel);
                    source.appendChild(source2);
                    specialElementHandlers = {
                        '#bypassme': function (element, renderer) {
                            return true
                        }
                    };
                    margins = {
                        top: 20,
                        bottom: 20,
                        left: 20
                    };
                    pdf.fromHTML(
                        source, // HTML string or DOM elem ref.
                        margins.left, // x coord
                        margins.top, { // y coord
                            'width': margins.width, // max width of content on PDF
                            'elementHandlers': specialElementHandlers
                        },

                        function (dispose) {
                            pdf.save('Blast_Report.pdf');
                            TL_MessageBlast.Sent.refreshsent()
                        }, margins
                    );
            }
        </script>

  </div>
</div>

<div class="ms-PanelExample">

  <div class="ms-Panel ms-Panel--lg ms-Panel--fixed">
    <button class="ms-Panel-closeButton ms-PanelAction-close">
      <i class="ms-Panel-closeIcon ms-Icon ms-Icon--Cancel"></i>
    </button>
    <div class="ms-Panel-contentInner">
      <p class="ms-Panel-headerText">Settings</p>
      <div class="ms-Panel-content">
        <span class="ms-font-m"></span>

        <div class="ms-Persona">
          <div class="ms-Persona-imageArea">
            <div class="ms-Persona-initials ms-Persona-initials--blue" id="userinitials"></div>
          </div>
          <div class="ms-Persona-presence">
            <i class="ms-Persona-presenceIcon ms-Icon ms-Icon--SkypeCheck"></i>
          </div>
          <div class="ms-Persona-details">
            <div class="ms-Persona-primaryText" id="username"></div>
          </div>
        </div>
        <br>

        <div class="ms-TextField">
          <label class="ms-Label">Title Preset 1</label>
          <input id="presettitle1" class="ms-TextField-field" type="text" value="" placeholder="">
        </div>

        <div class="ms-TextField ms-TextField--multiline">
          <label class="ms-Label">Message Preset 1</label>
          <div id="presetmessage1" class="ms-TextField-field presetmessage editable"></div>
        </div>

         <div class="ms-TextField">
          <label class="ms-Label">Title Preset 2</label>
          <input id="presettitle2" class="ms-TextField-field" type="text" value="" placeholder="">
        </div>

        <div class="ms-TextField ms-TextField--multiline">
          <label class="ms-Label">Message Preset 2</label>
          <div id="presetmessage2" class="ms-TextField-field presetmessage editable"></div>
        </div>

         <div class="ms-TextField">
          <label class="ms-Label">Title Preset 3</label>
          <input id="presettitle3" class="ms-TextField-field" type="text" value="" placeholder="">
        </div>

        <div class="ms-TextField ms-TextField--multiline">
          <label class="ms-Label">Message Preset 3</label>
          <div id="presetmessage3" class="ms-TextField-field presetmessage editable"></div>
        </div>

        <div class="ms-TextField">
          <label class="ms-Label">Title Preset 4</label>
          <input id="presettitle4" class="ms-TextField-field" type="text" value="" placeholder="">
        </div>

        <div class="ms-TextField ms-TextField--multiline">
          <label class="ms-Label">Message Preset 4</label>
          <div id="presetmessage4" class="ms-TextField-field presetmessage editable"></div>
        </div>
        <br>
        <br>
      </div>
    </div>
  </div>
</div>
<div class="docswarningDialogclose">
      <div class="ms-Dialog ms-Dialog--blocking">
        <button class="ms-Dialog-button ms-Dialog-buttonClose">
          <i class="ms-Icon ms-Icon--Cancel"></i>
        </button>
        <div class="ms-Dialog-title">Warning</div>
        <div class="ms-Dialog-content">
          Problem
        </div>
        <div class="ms-Dialog-actions">
          <button class="ms-Button ms-Dialog-action ms-Button--primary">
            <span class="ms-Button-label">OK</span>
          </button>
        </div>
      </div>
    </div>


 <script>var editor = new MediumEditor('.editable',{
                placeholder: false,
                paste: {
                    /* This example includes the default options for paste,
                       if nothing is passed this is what it used */
                    forcePlainText: true,
                    cleanPastedHTML: false,
                    cleanReplacements: [],
                    cleanAttrs: ['class', 'style', 'dir'],
                    cleanTags: ['meta'],
                    unwrapTags: []
                }
            });
    </script>



</body>
</html>
