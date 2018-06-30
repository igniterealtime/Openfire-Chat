package org.traderlynk.blast;

import java.util.*;

import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlRootElement;

@XmlRootElement(name = "groups")
public class BlastGroups {
    List<BlastGroup> groups = new ArrayList<BlastGroup>();

    public BlastGroups() {
    }

    public BlastGroups(List<BlastGroup> groups) {
        this.groups = groups;
    }

    @XmlElement(name = "group")
    public List<BlastGroup> getGroups() {
        return groups;
    }

    public void setGroups(List<BlastGroup> groups) {
        this.groups = groups;
    }
}
