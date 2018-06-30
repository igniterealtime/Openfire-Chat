package org.traderlynk.blast;

import org.jivesoftware.openfire.plugin.rest.entity.*;
import java.time.Instant;
import org.jivesoftware.util.JiveGlobals;

public class BlastChat {
    public String id = null;
    public String username = null;
    public String from = null;
    public String to = null;
    public String replyTo = null;
    public String subject = null;
    public String body = null;
    public String response = null;
    public String conversationHref = null;
    public String error = null;
    public String endpoint = null;

    public String firstAttemptTimeStamp;
    public String lastAttemptTimeStamp;
    public String presence;
    public String retriesLeft;

    public BlastChat(String username, String id, String from, String to, String replyTo, String subject, String body)
    {
        this.id = id;
        this.username = username;
        this.from = from;
        this.to = to;
        this.replyTo = replyTo;
        this.subject = subject;
        this.body = body;
        this.response = null;
        this.conversationHref = null;
        this.firstAttemptTimeStamp = Instant.now().toString();
        this.lastAttemptTimeStamp = this.firstAttemptTimeStamp;
        this.retriesLeft = JiveGlobals.getProperty("ofchat.max.retries", "20");
        this.presence = "offline";
    }

    synchronized public void setMessageRead(String conversationHref)
    {
        MessageBlastSentEntity job = MessageBlastController.getInstance().blastSents.get(id);

        if (job != null && this.conversationHref == null)
        {
            int count = job.getReadCount();
            count++;
            job.setReadCount(count);
        }
        this.presence = "online";
        this.conversationHref = (conversationHref != null) ? conversationHref : this.conversationHref;
    }

    synchronized public void setRecipientsCount()
    {
        MessageBlastSentEntity job = MessageBlastController.getInstance().blastSents.get(id);

        if (job != null)
        {
            int count = job.getRecieveCount();
            count++;
            job.setRecieveCount(count);

            count = job.getRecipientsCount();
            count++;
            job.setRecipientsCount(count);
        }
     }

    synchronized public void setMessageResponded(String response)
    {
        MessageBlastSentEntity job = MessageBlastController.getInstance().blastSents.get(id);

        if (job != null && this.response == null)
        {
            int count = job.getRespondCount();
            count++;
            job.setRespondCount(count);
        }
        this.presence = "online";
        this.response = (response != null) ? response : this.response;
    }

    synchronized public void setMessageError(String error)
    {
        MessageBlastSentEntity job = MessageBlastController.getInstance().blastSents.get(id);

        if (job != null && this.error == null)
        {
            int count = job.getErrorCount();
            count++;
            job.setErrorCount(count);
        }
        this.error = (error != null) ? error : this.error;
    }

    public boolean isFiltered(String filter, String type)
    {
        try {
            if (type == null || "".equals(type))
            {
                return to.contains(filter) || replyTo.contains(filter) || subject.contains(filter) || body.contains(filter) || response.contains(filter);
            }
            else

            if ("read".equals(type) && this.conversationHref != null)
            {
                return to.contains(filter) || replyTo.contains(filter) || subject.contains(filter) || body.contains(filter) || response.contains(filter);
            }
            else

            if ("unread".equals(type) && this.conversationHref == null)
            {
                return to.contains(filter) || replyTo.contains(filter) || subject.contains(filter) || body.contains(filter) || response.contains(filter);
            }
            else

            if ("responded".equals(type) && this.response != null)
            {
                return to.contains(filter) || replyTo.contains(filter) || subject.contains(filter) || body.contains(filter) || response.contains(filter);
            }
            else

            if ("error".equals(type) && this.error != null)
            {
                return to.contains(filter) || replyTo.contains(filter) || subject.contains(filter) || body.contains(filter) || response.contains(filter);
            }

        } catch (Exception e) {

        }
        return false;
    }
}