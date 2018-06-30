<%@ page import="org.jivesoftware.util.*,
                 org.jivesoftware.openfire.user.*,
                 java.util.*,
                 java.io.*,
                 java.net.URLEncoder,
                 javax.mail.*,
                 javax.activation.*,
                 javax.mail.internet.*"
    errorPage="error.jsp"
%>
<%@ page import="java.text.SimpleDateFormat"%>
<%@ page import="org.xmpp.packet.JID" %>

<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c"%>
<%@ taglib uri="http://java.sun.com/jstl/fmt_rt" prefix="fmt"%>

<%-- Define Administration Bean --%>
<jsp:useBean id="webManager" class="org.jivesoftware.util.WebManager"  />
<% webManager.init(request, response, session, application, out ); %>

<% // Get paramters
    String username = ParamUtils.getParameter(request, "username");
    if (username == null) username = "";
    
    String certificatesHome = JiveGlobals.getHomeDirectory() + File.separator + "certificates";
    String file = certificatesHome + File.separator + username + File.separator + username + ".pfx";
            
    boolean doTest = request.getParameter("test") != null;
    boolean cancel = request.getParameter("cancel") != null;
    boolean sent = ParamUtils.getBooleanParameter(request, "sent");
    boolean success = ParamUtils.getBooleanParameter(request, "success");
    String from = ParamUtils.getParameter(request, "from");
    String to = ParamUtils.getParameter(request, "to");
    String subject = ParamUtils.getParameter(request, "subject");
    String body = ParamUtils.getParameter(request, "body");

    // Variable to hold messaging exception, if one occurs
    Exception mex = null;

    // Validate input
    Map<String, String> errors = new HashMap<String, String>();
    Cookie csrfCookie = CookieUtils.getCookie(request, "csrf");
    String csrfParam = ParamUtils.getParameter(request, "csrf");

    if (doTest) {
        if (csrfCookie == null || csrfParam == null || !csrfCookie.getValue().equals(csrfParam)) {
            doTest = false;
            errors.put("csrf", "CSRF Failure!");
        }
    }
    csrfParam = StringUtils.randomString(15);
    CookieUtils.setCookie(request, response, "csrf", csrfParam, -1);
    pageContext.setAttribute("csrf", csrfParam);
    
    if (doTest) {
        if (from == null) {
            errors.put("from", "");
        }
        if (to == null) {
            errors.put("to", "");
        }
        if (subject == null) {
            errors.put("subject", "");
        }
        if (body == null) {
            errors.put("body", "");
        }

        EmailService service = EmailService.getInstance();

        // Validate host - at a minimum, it needs to be set:
        String host = service.getHost();
        if (host == null) {
            errors.put("host", "");
        }

        // if no errors, continue
        if (errors.size() == 0) {
            // Create a message
            MimeMessage message = service.createMimeMessage();
            // Set the date of the message to be the current date
            SimpleDateFormat format = new SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss Z",
                    java.util.Locale.US);
            format.setTimeZone(JiveGlobals.getTimeZone());
            message.setHeader("Date", format.format(new Date()));

            // Set to and from.
            message.setRecipient(Message.RecipientType.TO, new InternetAddress(to, null));
            message.setFrom(new InternetAddress(from, null));
            message.setSubject(subject);
            
            Multipart multipart = new MimeMultipart();

            MimeBodyPart textBodyPart = new MimeBodyPart();
            textBodyPart.setText(body);

            MimeBodyPart attachmentBodyPart= new MimeBodyPart();
            DataSource source = new FileDataSource(file);
            attachmentBodyPart.setDataHandler(new DataHandler(source));
            attachmentBodyPart.setFileName(username + ".pfx"); 

            multipart.addBodyPart(textBodyPart);
            multipart.addBodyPart(attachmentBodyPart);

            message.setContent(multipart);
        
            // Send the message, wrap in a try/catch:
            try {
                service.sendMessagesImmediately(Collections.singletonList(message));
                // success, so indicate this:
                response.sendRedirect("email-certificate.jsp?sent=true&success=true&username=" + username);
                return;
            }
            catch (MessagingException me) {
                me.printStackTrace();
                mex = me;
            }
        }
    }

    // Set var defaults
    
    if (username != null) 
    {
        User user = webManager.getUserManager().getUser(username);
        
        if (from == null) {
            from = user.getEmail();
        }
        
        if (to == null) {
            to = user.getEmail();
        }
    }

    if (subject == null) {
        subject = "Client Certificate for MTLS with Openfire";
    }
    if (body == null) {
        body = "Please find attached, your client certificate";
    }
%>

<html>
    <head>
        <title><fmt:message key="email.certificate.title"/></title>
        <meta name="subPageID" content="email-certificate"/>
        <meta name="extraParams" content="<%="username=" + URLEncoder.encode(username, "UTF-8")%>" />        
    </head>
    <body>

<script language="JavaScript" type="text/javascript">
var clicked = false;
function checkClick(el) {
    if (!clicked) {
        clicked = true;
        return true;
    }
    return false;
}
</script>

<p>
<fmt:message key="email.certificate.info" />
</p>

<%  if (JiveGlobals.getProperty("mail.smtp.host") == null) { %>

    <div class="jive-error">
    <table cellpadding="0" cellspacing="0" border="0">
    <tbody>
        <tr>
            <td class="jive-icon"><img src="images/error-16x16.gif" width="16" height="16" border="0" alt=""></td>
            <td class="jive-icon-label">
                <fmt:message key="email.certificate.no_host">
                    <fmt:param value="<a href=\"email-certificate.jsp?username=<%= username %>\">"/>
                    <fmt:param value="</a>"/>
                </fmt:message>
            </td>
        </tr>
    </tbody>
    </table>
    </div>

<%  } %>

<%  if (doTest || sent) { %>

    <%  if (success) { %>

        <div class="jive-success">
        <table cellpadding="0" cellspacing="0" border="0">
        <tbody>
            <tr>
                <td class="jive-icon"><img src="images/success-16x16.gif" width="16" height="16" border="0" alt=""></td>
                <td class="jive-icon-label"><fmt:message key="email.certificate.success" /></td>
            </tr>
        </tbody>
        </table>
        </div>

    <%  } else { %>

        <div class="jive-error">
        <table cellpadding="0" cellspacing="0" border="0">
        <tbody>
            <tr><td class="jive-icon"><img src="images/error-16x16.gif" width="16" height="16" border="0" alt=""></td>
            <td class="jive-icon-label">
                <fmt:message key="email.certificate.failure" />
                <%  if (mex != null) { %>
                    <%  if (mex instanceof AuthenticationFailedException) { %>
                        <fmt:message key="email.certificate.failure_authentication" />                        
                    <%  } else { %>
                        (Message: <%= StringUtils.escapeHTMLTags(mex.getMessage()) %>)
                    <%  } %>
                <%  } %>
            </td></tr>
        </tbody>
        </table>
        </div>

    <%  } %>

    <br>

<%  } %>

<form action="email-certificate.jsp" method="post" name="f" onsubmit="return checkClick(this);">
        <input type="hidden" name="csrf" value="${csrf}">
        <input type="hidden" name="username" value="<%= username %>">        

<table cellpadding="3" cellspacing="0" border="0">
<tbody>
    <tr>
        <td>
            <fmt:message key="email.certificate.mail_server" />:
        </td>
        <td>
            <%  String host = JiveGlobals.getProperty("mail.smtp.host");
                if (host == null) {
            %>
                <i><fmt:message key="email.certificate.host_not_set" /></i>
            <%
                } else {
            %>
                <%= StringUtils.escapeHTMLTags(host) %>:<%= JiveGlobals.getIntProperty("mail.smtp.port", 25)  %>

                <%  if (JiveGlobals.getBooleanProperty("mail.smtp.ssl", false)) { %>

                    (<fmt:message key="email.certificate.ssl" />)

                <%  } %>
            <%  } %>
        </td>
    </tr>
    <tr>
        <td>
            <fmt:message key="email.certificate.from" />:
        </td>
        <td>
            <input type="hidden" name="from" value="<%= StringUtils.escapeForXML(from) %>">
            <%= StringUtils.escapeHTMLTags(from) %>
            <span class="jive-description">
            (<a href="/user-edit-form.jsp?username=<%= URLEncoder.encode(username)%>"><fmt:message key="email.certificate.update-address" /></a>)
            </span>
        </td>
    </tr>
    <tr>
        <td>
            <fmt:message key="email.certificate.to" />:
        </td>
        <td>
            <input type="text" name="to" value="<%= ((to != null) ? StringUtils.escapeForXML(to) : "") %>"
             size="40" maxlength="100">
        </td>
    </tr>
    <tr>
        <td>
            <fmt:message key="email.certificate.subject" />:
        </td>
        <td>
            <input type="text" name="subject" value="<%= ((subject != null) ? StringUtils.escapeForXML(subject) : "") %>"
             size="40" maxlength="100">
        </td>
    </tr>
    <tr valign="top">
        <td>
            <fmt:message key="email.certificate.body" />:
        </td>
        <td>
            <textarea name="body" cols="45" rows="5" wrap="virtual"><%= StringUtils.escapeHTMLTags(body) %></textarea>
        </td>
    </tr>
    <tr>
        <td colspan="2">
            <br/>            
<%
            if ((new File(file)).exists())
            {
%>            
                <input type="submit" name="test" value="<fmt:message key="email.certificate.send" />">
<%                
            } else {
%>
                <b>No certificate found</b>
<%
            }
%>
        </td>
    </tr>
</tbody>
</table>

</form>

    </body>
</html>
