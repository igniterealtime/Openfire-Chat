package org.traderlynk.blast;

import java.util.ArrayList;
import java.util.List;
import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlRootElement;
import net.sf.json.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * The Class MessageBlastEntity.
 */
@XmlRootElement(name = "messageblast")
public class MessageBlastEntity {

    private String title;
    private String message;
    private String messagehtml;
    private List<String> recipients;
    private String dateToSend;
    private String dateToStop;
    private boolean ackRequired;
    private boolean highImportance;
    private boolean sendlater;
    private String replyTo;
    private String sender;
    private String username;
    private String cronjob;
    private String crongroup;
    private String crontrigger;

    private String cronquartz;
    private String cronstop;

    private static final Logger Log = LoggerFactory.getLogger(MessageBlastEntity.class);

    public MessageBlastEntity() {
    }

    public MessageBlastEntity(String title, String message, List<String> recipients, boolean ackRequired,
            String dateToSend, boolean highImportance, String replyTo, String sender) {
        if (title == null) {
            throw new IllegalArgumentException("Title is required");
        }
        if (message == null) {
            throw new IllegalArgumentException("Message is required");
        }
        if (recipients == null) {
            throw new IllegalArgumentException("Recipients is required");
        }
        if (replyTo == null) {
            throw new IllegalArgumentException("ReplyTo is required");
        }
        if (sender == null) {
            throw new IllegalArgumentException("Sender is required");
        }

        this.title = title;
        this.message = message;
        this.recipients = recipients;
        this.replyTo = replyTo;
        this.sender = sender;
        this.ackRequired = ackRequired;
        this.dateToSend = dateToSend;
        this.highImportance = highImportance;

    }

    public MessageBlastEntity(JSONObject jsMbe) {
        try {
            this.title = jsMbe.getString("title");
            this.message = jsMbe.getString("message");
            this.messagehtml = jsMbe.getString("message");
            this.ackRequired = jsMbe.getBoolean("ackRequired");
            this.highImportance = jsMbe.getBoolean("highImportance");
            this.replyTo = jsMbe.getString("replyTo");
            this.sender = jsMbe.getString("sender");

            if (jsMbe.has("datetosend")) this.dateToSend = jsMbe.getString("datetosend");
            if (jsMbe.has("datetostop")) this.dateToStop = jsMbe.getString("datetostop");
            if (jsMbe.has("sendlater")) this.sendlater = jsMbe.getBoolean("sendlater");
            if (jsMbe.has("crontrigger")) this.crontrigger = jsMbe.getString("crontrigger");
            if (jsMbe.has("cronjob")) this.cronjob = jsMbe.getString("cronjob");
            if (jsMbe.has("crongroup")) this.crongroup = jsMbe.getString("crongroup");
            if (jsMbe.has("cronquartz")) this.cronquartz = jsMbe.getString("cronquartz");
            if (jsMbe.has("cronstop")) this.cronstop = jsMbe.getString("cronstop");


            List<String> recipients = new ArrayList<String>();
            try {
                JSONArray ja = new JSONArray(jsMbe.getJSONArray("recipients"));
                for (int i = 0; i < ja.length(); i++) {
                    recipients.add(ja.getString(i));
                }

            } catch (Exception e) {
                //has no recipients
            }
            this.recipients = recipients;
        } catch (Exception e) {
            Log.error("MessageBlastEntity Failed to parse Message Blast Entity from JSON", e);
        }

    }

    @XmlElement
    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    @XmlElement
    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    @XmlElement
    public String getMessagehtml() {
        return messagehtml;
    }

    public void setMessagehtml(String messagehtml) {
        this.messagehtml = messagehtml;
    }

    @XmlElement(name = "recipients")
    public List<String> getRecipients() {
        return recipients;
    }

    public void setRecipients(List<String> recipients) {
        this.recipients = recipients;
    }

    @XmlElement
    public boolean getAckRequired() {
        return ackRequired;
    }

    public void setAckRequired(boolean ackRequired) {
        this.ackRequired = ackRequired;
    }

    @XmlElement
    public String getDateToStop() {
        return dateToStop;
    }

    public void setDateTostop(String dateToStop) {
        this.dateToStop = dateToStop;
    }

    @XmlElement
    public String getDateToSend() {
        return dateToSend;
    }

    public void setDateToSend(String dateToSend) {
        this.dateToSend = dateToSend;
    }

    @XmlElement
    public boolean getHighImportance() {
        return ackRequired;
    }

    public void setHighImportance(boolean ackRequired) {
        this.ackRequired = ackRequired;
    }

    @XmlElement
    public boolean getSendlater() {
        return sendlater;
    }

    public void setSendlater(boolean sendlater) {
        this.sendlater = sendlater;
    }

    @XmlElement
    public String getUsername() {
        return this.username;
    }

    public void setUsername(String username) {
        this.username = username;
    }
    @XmlElement
    public String getCronjob() {
        return this.cronjob;
    }

    public void setCronjob(String cronjob) {
        this.cronjob = cronjob;
    }
    @XmlElement
    public String getCrongroup() {
        return this.crongroup;
    }

    public void setCrongroup(String crongroup) {
        this.crongroup = crongroup;
    }

    @XmlElement
    public String getCrontrigger() {
        return this.crontrigger;
    }

    public void setCrontrigger(String crontrigger) {
        this.crontrigger = crontrigger;
    }
    @XmlElement
    public String getCronquartz() {
        return this.cronquartz;
    }

    public void setCronquartz(String cronquartz) {
        this.cronquartz = cronquartz;
    }

    @XmlElement
    public String getCronstop() {
        return this.cronstop;
    }

    public void setCronstop(String cronstop) {
        this.cronstop = cronstop;
    }
    @XmlElement
    public String getReplyTo() {
        return this.replyTo;
    }

    public void setReplyTo(String replyTo) {
        this.replyTo = replyTo;
    }

    @XmlElement
    public String getSender() {
        return this.sender;
    }

    public void setSender(String sender) {
        this.sender = sender;
    }

    public boolean hasNulls(){
        if(title != null && message != null && recipients != null && replyTo != null && sender != null &&
            !"".equals(title) && !"".equals(message) && recipients.size() > 0 && !"".equals(replyTo) && !"".equals(sender))
        {
            return false;
        }else{
            return true;
        }
    }
    public String toJSONString() {
        JSONObject jso = new JSONObject();
        try {
            jso.put("title", this.title);
            jso.put("message", this.message);
            JSONArray ja = new JSONArray();
            for (String r : this.recipients) {
                ja.put(r);
            }
            jso.put("recipients", ja);
            jso.put("ackRequired", this.ackRequired);
            jso.put("highImportance", this.highImportance);
            jso.put("datetosend", this.dateToSend);
            jso.put("datetosstop", this.dateToStop);
            jso.put("replyTo", this.replyTo);
            jso.put("sender",this.sender);
            jso.put("crontrigger",this.crontrigger);
            jso.put("crongroup",this.crongroup);
            jso.put("cronjob",this.cronjob);
            jso.put("cronquartz",this.cronquartz);
            jso.put("cronstop",this.cronstop);
            jso.put("sendlater",this.sendlater);

        } catch (Exception e) {
            Log.error("MessageBlastEntity Failed parsing object to JSON " + e.getMessage());
        }
        return jso.toString();
    }
}
