package org.traderlynk.blast;

import java.util.List;

import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlRootElement;

@XmlRootElement(name = "blasts")
public class MessageBlastEntities {
    List<MessageBlastEntity> blasts;

    public MessageBlastEntities() {
    }

    public MessageBlastEntities(List<MessageBlastEntity> blasts) {
        this.blasts = blasts;
    }

    @XmlElement(name = "blast")
    public List<MessageBlastEntity> getBlasts() {
        return blasts;
    }

    public void setBlasts(List<MessageBlastEntity> blasts) {
        this.blasts = blasts;
    }
}
