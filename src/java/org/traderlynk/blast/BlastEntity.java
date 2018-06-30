package org.traderlynk.blast;


import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlRootElement;

/**
 * The Class BlastEntity.
 */
@XmlRootElement(name = "blast")
public class BlastEntity {

    private String sipUri;
    private String name;
    private String messageIn;
    private String messageOut;
    private String messageError;
    private String subject;
    private String replyTo;
    private String jobId;
    private String endpoint;

    private boolean sent;
    private boolean read;
    private boolean responded;
    private boolean error;

    private String firstAttemptTimeStamp;
    private String lastAttemptTimeStamp;
    private String presence;
    private String retriesLeft;

    /**
     * Instantiates a new message entity.
     */
    public BlastEntity()
    {
    }

    public BlastEntity(String sipUri, String name)
    {
        this.sipUri = sipUri;
        this.name = name;
    }

    /**
     * Gets the sipUri.
     *
     * @return the sipUri
     */
    @XmlElement
    public String getSipUri() {
        return sipUri;
    }

    /**
     * Sets the sipUri.
     *
     * @param sipUri
     *            the new sipUri
     */
    public void setSipUri(String sipUri) {
        this.sipUri = sipUri;
    }
    /**
     * Gets the name.
     *
     * @return the name
     */
    @XmlElement
    public String getName() {
        return name;
    }

    /**
     * Sets the name.
     *
     * @param name
     *            the new name
     */
    public void setName(String name) {
        this.name = name;
    }
    /**
     * Gets the endpoint.
     *
     * @return the endpoint
     */
    @XmlElement
    public String getEndpoint() {
        return endpoint;
    }

    /**
     * Sets the endpoint.
     *
     * @param endpoint
     *            the new endpoint
     */
    public void setEndpoint(String endpoint) {
        this.endpoint = endpoint;
    }

    /**
     * Gets the job id.
     *
     * @return the job id
     */
    @XmlElement
    public String getJobId() {
        return jobId;
    }

    /**
     * Sets the name.
     *
     * @param jobId
     *            the new jobId
     */
    public void setJobId(String jobId) {
        this.jobId = jobId;
    }

    /**
     * Gets the read.
     *
     * @return the read
     */
    @XmlElement
    public boolean getRead() {
        return read;
    }

    /**
     * Sets the read.
     *
     * @param read
     *            the new read
     */
    public void setRead(boolean read) {
        this.read = read;
    }

    /**
     * Gets the sent.
     *
     * @return the sent
     */
    @XmlElement
    public boolean getSent() {
        return sent;
    }

    /**
     * Sets the sent.
     *
     * @param sent
     *            the new sent
     */
    public void setSent(boolean sent) {
        this.sent = sent;
    }

    /**
     * Gets the responded.
     *
     * @return the responded
     */
    @XmlElement
    public boolean getResponded() {
        return responded;
    }

    /**
     * Sets the responded.
     *
     * @param responded
     *            the new responded
     */
    public void setResponded(boolean responded) {
        this.responded = responded;
    }
    /**
     * Gets the error.
     *
     * @return the error
     */
    @XmlElement
    public boolean getError() {
        return error;
    }

    /**
     * Sets the error.
     *
     * @param error
     *            the new error
     */
    public void setError(boolean error) {
        this.error = error;
    }

    /**
     * Gets the messageIn.
     *
     * @return the messageIn
     */
    @XmlElement
    public String getMessageIn() {
        return messageIn;
    }

    /**
     * Sets the messageIn.
     *
     * @param messageIn
     *            the new messageIn
     */
    public void setMessageIn(String messageIn) {
        this.messageIn = messageIn;
    }

    /**
     * Gets the messageOut.
     *
     * @return the messageOut
     */
    @XmlElement
    public String getMessageOut() {
        return messageOut;
    }

    /**
     * Sets the messageOut.
     *
     * @param messageOut
     *            the new messageOut
     */
    public void setMessageOut(String messageOut) {
        this.messageOut = messageOut;
    }

    /**
     * Gets the messageError.
     *
     * @return the messageError
     */
    @XmlElement
    public String getMessageError() {
        return messageError;
    }

    /**
     * Sets the messageError.
     *
     * @param messageError
     *            the new messageError
     */
    public void setMessageError(String messageError) {
        this.messageError = messageError;
    }

    /**
     * Gets the replyTo.
     *
     * @return the replyTo
     */
    @XmlElement
    public String getReplyTo() {
        return replyTo;
    }

    /**
     * Sets the replyTo.
     *
     * @param replyTo
     *            the new replyTo
     */
    public void setReplyTo(String replyTo) {
        this.replyTo = replyTo;
    }

    /**
     * Gets the subject.
     *
     * @return the subject
     */
    @XmlElement
    public String getSubject() {
        return subject;
    }

    /**
     * Sets the subject.
     *
     * @param subject
     *            the new subject
     */
    public void setSubject(String subject) {
        this.subject = subject;
    }

    /**
     * Gets the retriesLeft.
     *
     * @return the retriesLeft
     */
    @XmlElement
    public String getRetriesLeft() {
        return retriesLeft;
    }

    /**
     * Sets the retriesLeft.
     *
     * @param retriesLeft
     *            the new retriesLeft
     */
    public void setRetriesLeft(String retriesLeft) {
        this.retriesLeft = retriesLeft;
    }

    /**
     * Gets the presence.
     *
     * @return the presence
     */
    @XmlElement
    public String getPresence() {
        return presence;
    }

    /**
     * Sets the presence.
     *
     * @param presence
     *            the new presence
     */
    public void setPresence(String presence) {
        this.presence = presence;
    }

    /**
     * Gets the lastAttemptTimeStamp.
     *
     * @return the lastAttemptTimeStamp
     */
    @XmlElement
    public String getLastAttemptTimeStamp() {
        return lastAttemptTimeStamp;
    }

    /**
     * Sets the lastAttemptTimeStamp.
     *
     * @param lastAttemptTimeStamp
     *            the new lastAttemptTimeStamp
     */
    public void setLastAttemptTimeStamp(String lastAttemptTimeStamp) {
        this.lastAttemptTimeStamp = lastAttemptTimeStamp;
    }

    /**
     * Gets the firstAttemptTimeStamp.
     *
     * @return the firstAttemptTimeStamp
     */
    @XmlElement
    public String getFirstAttemptTimeStamp() {
        return firstAttemptTimeStamp;
    }

    /**
     * Sets the firstAttemptTimeStamp.
     *
     * @param firstAttemptTimeStamp
     *            the new firstAttemptTimeStamp
     */
    public void setFirstAttemptTimeStamp(String firstAttemptTimeStamp) {
        this.firstAttemptTimeStamp = firstAttemptTimeStamp;
    }
}
