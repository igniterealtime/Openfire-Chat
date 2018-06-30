package org.traderlynk.blast;

import java.util.*;

import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlElementWrapper;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlType;

/**
 * The Class BlastGroup.
 */
@XmlRootElement(name = "group")
public class BlastGroup {

    private List<BlastEntity> users = new ArrayList<BlastEntity>();
    private String name;

    /**
     * Instantiates a new message entity.
     */
    public BlastGroup()
    {
    }

    public BlastGroup(List<BlastEntity> users, String name)
    {
        this.users = users;
        this.name = name;
    }
    /**
     * Gets the sipUri.
     *
     * @return the sipUri
     */
    @XmlElement(name = "user")
    public List<BlastEntity> getUsers() {
        return users;
    }

    /**
     * Sets the sipUri.
     *
     * @param sipUri
     *            the new sipUri
     */
    public void setUsers(List<BlastEntity> users) {
        this.users = users;
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
}
