package org.traderlynk.blast;

import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlRootElement;
import org.json.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * The Class MessageBlastEntity.
 */
@XmlRootElement(name = "sentblast")
public class MessageBlastSentEntity {

    private String id;
    private String title;
    private int recipientsCount;
    private int sentCount;
    private int recieveCount;
    private int readCount;
    private int respondCount;
    private int errorCount;
    private String sentDate;
    private boolean completed;
    private static final Logger Log = LoggerFactory.getLogger(MessageBlastSentEntity.class);
    private MessageBlastEntity mbe;
    private String openfireUser;

    public MessageBlastSentEntity() {
    }

    public MessageBlastSentEntity(String id, String title, int recipientsCount, int sentCount, String sentDate,
            int respondCount, int readCount, int recieveCount, int errorCount, MessageBlastEntity mbe, String openfireUser) {
        this.id = id;
        this.title = title;
        this.recipientsCount = recipientsCount;
        this.sentCount = sentCount;
        this.sentDate = sentDate;
        this.errorCount = errorCount;
        this.completed = false;
        this.mbe = mbe;
        this.openfireUser = openfireUser;
    }

    @XmlElement
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    @XmlElement
    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    @XmlElement
    public int getRecipientsCount() {
        return recipientsCount;
    }

    public void setRecipientsCount(int recipientsCount) {
        this.recipientsCount = recipientsCount;
    }

    @XmlElement
    public int getSentCount() {
        return sentCount;
    }

    public void setSentCount(int sentCount) {
        this.sentCount = sentCount;
        if (sentCount >= recipientsCount) {
            this.completed = true;
        }
    }

    @XmlElement
    public int getRecieveCount() {
        return recieveCount;
    }
    public void setRecieveCount(int recieveCount) {
        this.recieveCount = recieveCount;
    }

    @XmlElement
    public int getErrorCount() {
        return errorCount;
    }
    public void setErrorCount(int errorCount) {
        this.errorCount = errorCount;
    }


    @XmlElement
    public int getReadCount() {
        return readCount;
    }
    public void setReadCount(int readCount) {
        this.readCount = readCount;
    }

    @XmlElement
    public int getRespondCount() {
        return respondCount;
    }
    public void setRespondCount(int respondCount) {
        this.respondCount = respondCount;
    }

    @XmlElement
    public String getSentDate() {
        return sentDate;
    }
    public void setSentDate(String sentDate) {
        this.sentDate = sentDate;
    }

    @XmlElement
    public boolean getCompleted() {
        return completed;
    }
    public void setCompleted(boolean completed) {
        this.completed = completed;
    }

    @XmlElement
    public MessageBlastEntity getMessageBlastEntity() {
        return mbe;
    }
    public void setMessageBlastEntity(MessageBlastEntity mbe) {
        this.mbe = mbe;
    }

    @XmlElement
    public String getOpenfireUser() {
        return openfireUser;
    }
    public void setOpenfireUser(String openfireUser) {
        this.openfireUser = openfireUser;
    }

    public String toJSONString() {
        JSONObject jso = new JSONObject();
        try {
            jso.put("id", this.id);
            jso.put("title", this.title);
            jso.put("recipientsCount", this.recipientsCount);
            jso.put("sentCount", this.sentCount);
            jso.put("recieveCount", this.recieveCount);
            jso.put("readCount", this.readCount);
            jso.put("respondCount", this.respondCount);
            jso.put("completed", this.completed);
            jso.put("sentDate", this.sentDate);
            jso.put("mbe", this.mbe.toJSONString());
            jso.put("openfireUser", this.openfireUser);
        } catch (Exception e) {
            Log.error("MessageBlastSentEntity Failed parsing object to JSON " + e.getMessage());
        }
        return jso.toString();
    }

}
