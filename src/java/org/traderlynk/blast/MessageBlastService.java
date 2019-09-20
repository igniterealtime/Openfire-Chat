package org.traderlynk.blast;

import javax.servlet.http.HttpServletRequest;
import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.QueryParam;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Context;

import java.util.*;
import java.time.*;
import java.util.concurrent.*;

import org.jivesoftware.openfire.plugin.rest.exceptions.ServiceException;
import org.jivesoftware.openfire.plugin.rest.exceptions.ExceptionType;
import org.jivesoftware.openfire.plugin.rest.entity.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import net.sf.json.*;
import org.jivesoftware.openfire.plugin.rest.BasicAuth;

import org.jivesoftware.util.*;
import org.codehaus.jackson.map.*;
import org.codehaus.jackson.xc.*;

import org.quartz.*;
import org.quartz.impl.StdSchedulerFactory;
import static org.quartz.CronScheduleBuilder.cronSchedule;
import static org.quartz.JobBuilder.newJob;
import static org.quartz.TriggerBuilder.newTrigger;


@Path("restapi/v1/messageblast")
public class MessageBlastService implements Job {

private static final Logger Log = LoggerFactory.getLogger(MessageBlastService.class);

    private static MessageBlastController messageBlastController = MessageBlastController.getInstance();
    private static Scheduler scheduler = null;
    private static ConcurrentHashMap<String, MessageBlastEntity> futureBlasts = new ConcurrentHashMap<String, MessageBlastEntity>();

    @Context
    private HttpServletRequest httpRequest;

    @PostConstruct
    public void init()
    {

    }

    public static void start()
    {
        try {
            Log.debug("MessageBlastService: initialise scheduler");

            scheduler = StdSchedulerFactory.getDefaultScheduler();
            scheduler.start();

            List<String> properties = JiveGlobals.getPropertyNames();
            List<String> deletes = new ArrayList<String>();

            for (String propertyName : properties) {

                if (propertyName.indexOf("ofchat.cron.") == 0)
                {
                    Log.debug("Loading cron job " + propertyName);

                    MessageBlastEntity messageBlast = new MessageBlastEntity(new JSONObject(JiveGlobals.getProperty(propertyName)));
                    String error = quartzBlast(messageBlast);

                    if (error != null)
                    {
                        Log.error("MessageBlastService boot error " + error);
                    }
                }
            }

        } catch (SchedulerException se) {
            Log.error("MessageBlastService init", se);
        }
    }

    public static void stop()
    {
        Log.debug("MessageBlastService: destroy scheduler");

        try {
            scheduler.shutdown();

        } catch (SchedulerException se) {
            Log.error("MessageBlastService destroy", se);
        }
    }
    @GET
    @Path("/recievers/{from}")
    @Produces({MediaType.APPLICATION_XML, MediaType.APPLICATION_JSON})
    public BlastGroups getContactGroups(@PathParam("from") String from, @DefaultValue("") @QueryParam("query") String query, @DefaultValue("") @QueryParam("limit") String limit) throws ServiceException
    {
        String username = getEndUser();

        Log.debug("getContactGroups " + username + " " + from + " " + query + " " + limit);

        try {
            if (query != null && "".equals(query) == false)
            {
                return messageBlastController.searchContacts(username, from, query, limit);
            }
            else
                return messageBlastController.fetchGroups(username, from);

        } catch (Exception e) {
            Log.error("getContactGroups", e);
            throw new ServiceException(e.getMessage(), "Exception", ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
        }
    }

    @POST
    @Path("/sendblast")
    public Response SendBlast(MessageBlastEntity messageBlast) throws ServiceException
    {
        Log.debug("MessageBlastService \n" + messageBlast.toJSONString());

        if (messageBlast.getSendlater())
        {
            messageBlast.setUsername(getEndUser());
            String response = scheduleBlast(messageBlast);

            if (response != null)
            {
                throw new ServiceException(response, "Error", ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
            }

            return Response.status(Response.Status.OK).build();

        } else {

            JSONObject returnobj = messageBlastController.routeMessageBlast(getEndUser(),messageBlast, null);

             if(returnobj.has("Type")){
                 if(returnobj.get("Type") == "Error"){
                    if(returnobj.has("Message")){
                        throw new ServiceException(returnobj.getString("Message"), "Exception", ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
                    }else{
                        throw new ServiceException("Service Error", "Exception", ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
                    }
                 }else{
                     return Response.status(Response.Status.OK).build();
                 }

            } else{
                 throw new ServiceException("Service Error", "Exception", ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
            }
         }
    }

    @GET
    @Path("/senders")
    @Produces({MediaType.APPLICATION_JSON})
    public String getSenders() throws ServiceException
    {
        String mbse;

        try {
            mbse = messageBlastController.getSenders(getEndUser());
        } catch (Exception e) {
            Log.error("MessageBlastService Error retrieving senders list ", e);
            throw new ServiceException(e.getMessage(), "Exception", ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
        }
        return mbse;
    }

    @POST
    @Path("/senders")
    public Response createSenderList(String mbse) throws ServiceException {
        JSONObject returnobj = messageBlastController.CreateSenderList(mbse, getEndUser());
        if (returnobj.has("Type")) {
            if (returnobj.get("Type") == "Error") {
                if (returnobj.has("Message")) {
                    throw new ServiceException(returnobj.getString("Message"), "Exception", ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
                } else {
                    throw new ServiceException("Service Error", "Exception", ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
                }
            }
        }
            return Response.status(Response.Status.OK).build();
    }

    @GET
    @Path("/sentblasts")
    public MessageBlastSentEntities getSentBlasts() throws ServiceException
    {
        try {
             return messageBlastController.getSentBlasts(getEndUser());
        } catch (Exception e) {
            Log.error("MessageBlastService Error retrieving sent blasts ", e);
            throw new ServiceException(e.getMessage(), "Exception", ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
        }
    }

    @GET
    @Path("/sentblasts/{from}/{jobId}")
    public BlastGroups getSentBlastDetails(@PathParam("from") String from, @PathParam("jobId") String jobId, @DefaultValue("") @QueryParam("filter") String filter, @DefaultValue("") @QueryParam("type") String type, @DefaultValue("1") @QueryParam("start") String start, @DefaultValue("100") @QueryParam("count") String count) throws ServiceException
    {
        try {
            String username = getEndUser();
            return messageBlastController.fetchConversations(username, from, jobId, filter, type, start, count);
        } catch (Exception e) {
            Log.error("MessageBlastService Error retrieving sent blast details ", e);
            throw new ServiceException(e.getMessage(), "Exception", ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
        }
    }

    @DELETE
    @Path("/sentblasts/{from}/{jobId}")
    public Response deleteSentBlasts(@PathParam("from") String from, @PathParam("jobId") String jobId) throws ServiceException
    {
        try {
            String username = getEndUser();
            String response = messageBlastController.deleteSentBlasts(username, from, jobId);

            if (response != null)
            {
                throw new ServiceException(response, "Error", ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
            }
        } catch (Exception e) {
            Log.error("MessageBlastService Error deleting sent blast details ", e);
            throw new ServiceException(e.getMessage(), "Exception", ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
        }

        return Response.status(Response.Status.OK).build();
    }

    @GET
    @Path("/blasts")
    public MessageBlastEntities getBlasts() throws ServiceException
    {
        try {
            String username = getEndUser();
            List<MessageBlastEntity> blasts = new ArrayList<MessageBlastEntity>();

            List<String> properties = JiveGlobals.getPropertyNames();

            for (String propertyName : properties) {

                if (propertyName.indexOf("ofchat.cron." + username + ".") == 0)
                {
                    MessageBlastEntity messageBlast = new MessageBlastEntity(new JSONObject(JiveGlobals.getProperty(propertyName)));
                    blasts.add(messageBlast);
                }
            }

            return new MessageBlastEntities(blasts);
        } catch (Exception e) {
            Log.error("MessageBlastService Error retrieving cron job blasts ", e);
            throw new ServiceException(e.getMessage(), "Exception", ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
        }
    }

    @DELETE
    @Path("/blasts/{jobId}")
    public Response deleteBlast(@PathParam("jobId") String jobId) throws ServiceException
    {
        try {
            String username = getEndUser();
            String key = "ofchat.cron." + username + "." + jobId;

            MessageBlastEntity messageBlast = new MessageBlastEntity(new JSONObject(JiveGlobals.getProperty(key)));

            if (messageBlast != null)
            {
                String response = unScheduleBlast(messageBlast.getCronjob(), messageBlast.getCrongroup(), username);

                if (response != null)
                {
                    throw new ServiceException(response, "Error", ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
                }

            } else {
                throw new ServiceException("blast cron job " + jobId + " not found", "Error", ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
            }

        } catch (Exception e) {
            Log.error("deleting cron job blast ", e);
            throw new ServiceException(e.getMessage(), "Exception", ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
        }

        return Response.status(Response.Status.OK).build();
    }

    private String getEndUser() throws ServiceException
    {
        String token = httpRequest.getHeader("authorization");

        Log.debug("getEndUser " + token);

        if (token != null)
        {
            String[] usernameAndPassword = BasicAuth.decode(token);

            if (usernameAndPassword != null && usernameAndPassword.length == 2)
            {

                return usernameAndPassword[0];
            }
        }

        throw new ServiceException("Access denied", "Exception", ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
    }

    private String scheduleBlast(MessageBlastEntity messageBlast)
    {
        String schedule = messageBlast.getCrontrigger();

        String job = "blast-job-" + System.currentTimeMillis();
        String group = "blast-group-" + System.currentTimeMillis();
        String trigger = "blast-trigger-" + System.currentTimeMillis();

        Log.debug( "scheduleBlast " + job + " " + group + " " + trigger + " " + schedule);

        try {
            messageBlast.setCronjob(job);
            messageBlast.setCrongroup(group);

            String response = quartzBlast(messageBlast);

            if (response == null)
            {
                JiveGlobals.setProperty("ofchat.cron." + messageBlast.getUsername() + "." + job, messageBlast.toJSONString());
            }

            return response;
        }
        catch (Exception e) {
            Log.error("scheduleBlast", e);
            return e.toString();
        }
    }

    private static boolean isNull(String value)
    {
        return value == null || "".equals(value.trim());
    }

    private static String quartzBlast(MessageBlastEntity messageBlast)
    {
        try {
            String job = messageBlast.getCronjob();
            String group = messageBlast.getCrongroup();
            String schedule =  messageBlast.getCrontrigger();

            if (job == null) job = "blast-job-" + System.currentTimeMillis();
            if (group == null) group = "blast-group-" + System.currentTimeMillis();

            String triggerId = "blast-trigger-" + System.currentTimeMillis();
            String username = messageBlast.getUsername();

            JobDetail jobDetail = newJob(MessageBlastService.class).withIdentity(job, group).build();
            String key = jobDetail.getKey().toString();

            Log.debug( "quartzBlast " + job + " " + group + " " + username + " " + key + " " + schedule + " " + triggerId);

            futureBlasts.put(key, messageBlast);

            // timestamp in expected format "2013-09-27 00:00:00.0";

            Date startDate = null;
            Date endDate = null;

            try {
                if (isNull(messageBlast.getDateToSend()) == false)
                {
                    startDate = Date.from(Instant.parse(messageBlast.getDateToSend()));
                }

                if (isNull(messageBlast.getCronstop()) == false)
                {
                    endDate = Date.from(Instant.parse(messageBlast.getCronstop()));
                }
            } catch (Exception e) {
                Log.error("Failed to convert dates in quartz blast job...", e);
                return e.toString();
            }
            Trigger trigger = null;

            if (isNull(schedule) == false && endDate != null && startDate != null)
            {
                trigger = (CronTrigger) newTrigger()
                    .withIdentity(triggerId, group)
                    .startAt(startDate)
                    .withSchedule(cronSchedule(schedule))
                    .endAt(endDate)
                    .build();
            }
            else

            if (isNull(schedule) == false && endDate != null)
            {
                trigger = (CronTrigger) newTrigger()
                    .withIdentity(triggerId, group)
                    .withSchedule(cronSchedule(schedule))
                    .endAt(endDate)
                    .build();
            }
            else

            if (isNull(schedule) == false)
            {
                trigger = (CronTrigger) newTrigger()
                    .withIdentity(triggerId, group)
                    .withSchedule(cronSchedule(schedule))
                    .build();
            }
            else

            if (startDate != null)
            {
                trigger = newTrigger()
                    .withIdentity(triggerId, group)
                    .startAt(startDate)
                    .build();
            }

            scheduler.scheduleJob(jobDetail, trigger);

            return null;
        }
        catch (Exception e) {
            Log.error("Failed to add quartz blast job...", e);
            return e.toString();
        }
    }

    private String unScheduleBlast(String job, String group, String username)
    {
        String key = JobKey.jobKey(job, group).toString();

        Log.debug( "unScheduleBlast " + job + " " + group + " " + username + " " + key);

        try {
            JiveGlobals.deleteProperty("ofchat.cron." + username + "." + job);
            futureBlasts.remove(key);

            if (scheduler.checkExists(JobKey.jobKey(job, group)))
            {
                try {
                    scheduler.deleteJob(JobKey.jobKey(job, group));
                } catch (Throwable e) {
                    Log.warn("Failed to remove quartz job...", e);
                    return e.toString();
                }
            }
        }
        catch (Throwable e) {
            Log.warn("Failed to remove quartz job...", e);
            return e.toString();
        }
        return null;
    }

    @Override public void execute(JobExecutionContext jobExecutionContext) throws JobExecutionException
    {
        String key = jobExecutionContext.getJobDetail().getKey().toString();

        Log.debug( "Quartz Execute Job...." + key);

        try {
            MessageBlastEntity messageBlast = futureBlasts.get(key);

            List<String> recipients = messageBlast.getRecipients();
            messageBlastController.routeMessageBlast(messageBlast.getUsername(), messageBlast, null);
            messageBlast.setRecipients(recipients);     // restore processed recipients

        }
        catch (Throwable e) {
            Log.error("Failed to execute quartz job...", e);
        }
    }
}
