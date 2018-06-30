package org.traderlynk.blast;

import java.util.List;

import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlRootElement;


@XmlRootElement(name = "sentblasts")
public class MessageBlastSentEntities {
    List<MessageBlastSentEntity> sentBlasts;

    public MessageBlastSentEntities() {
    }

    public MessageBlastSentEntities(List<MessageBlastSentEntity> sentBlasts) {
        this.sentBlasts = sentBlasts;
    }

    @XmlElement(name = "sentblast")
    public List<MessageBlastSentEntity> getSentBlasts() {
        return sentBlasts;
    }

    public void setSentBlasts(List<MessageBlastSentEntity> sentBlasts) {
        this.sentBlasts = sentBlasts;
    }
}
