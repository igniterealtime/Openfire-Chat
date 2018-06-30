package org.jivesoftware.openfire.plugin.rest.service;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

import javax.annotation.PostConstruct;
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

import org.jivesoftware.openfire.plugin.rest.exceptions.ServiceException;
import org.jivesoftware.openfire.plugin.rest.exceptions.ExceptionType;
import org.jivesoftware.openfire.plugin.rest.entity.AssistEntity;
import org.jivesoftware.openfire.plugin.rest.entity.AskQueue;
import org.jivesoftware.openfire.auth.AuthFactory;

import org.jivesoftware.util.*;
import org.jivesoftware.openfire.user.*;
import org.jivesoftware.database.DbConnectionManager;

import org.jivesoftware.smack.OpenfireConnection;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import net.sf.json.*;
import com.j256.twofactorauth.TimeBasedOneTimePasswordUtil;

@Path("restapi/v1/ask")
public class AskService {

    private static final Logger Log = LoggerFactory.getLogger(AskService.class);

    @PostConstruct
    public void init()
    {

    }

/*
    {
        "userID": "deleo",
        "question": "hey jude",
        "emailAddress": "deleo",
        "workgroup": "demo"
    }
*/

    @POST
    @Path("/")
    @Produces({MediaType.APPLICATION_XML, MediaType.APPLICATION_JSON})
    public AssistEntity requestAssistance(AssistEntity assistance) throws ServiceException
    {
        try {
            String response = OpenfireConnection.requestAssistance(assistance);

            if (response != null)
            {
                throw new ServiceException(response, response, ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
            }

        } catch (Exception e) {
            throw new ServiceException("Exception", e.getMessage(), ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
        }

        return assistance;
    }

    @GET
    @Path("/{userId}")
    @Produces({MediaType.APPLICATION_XML, MediaType.APPLICATION_JSON})
    public AskQueue queryAssistance(@PathParam("userId") String userId) throws ServiceException
    {
        try {
            AskQueue queue = OpenfireConnection.queryAssistance(userId);

            if (queue == null)
            {
                throw new ServiceException("Error", "Ask workgroup is inaccesible", ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
            }
            return queue;

        } catch (Exception e) {
            throw new ServiceException("Exception", e.getMessage(), ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
        }
    }

    @POST
    @Path("/{userId}")
    public Response joinAssistChat(@PathParam("userId") String userId) throws ServiceException
    {
        try {
            boolean resp = OpenfireConnection.joinAssistChat(userId);

            if (resp == false)
            {
                throw new ServiceException("Error", "Ask workgroup is inaccesible", ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
            }

        } catch (Exception e) {
            throw new ServiceException("Exception", e.getMessage(), ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
        }
        return Response.status(Response.Status.OK).build();
    }

    @PUT
    @Path("/{userId}")
    public Response sendAssistMessage(@PathParam("userId") String userId, String body) throws ServiceException
    {
        try {
            boolean resp = OpenfireConnection.sendAssistMessage(userId, body);

            if (resp == false)
            {
                throw new ServiceException("Error", "Ask workgroup is inaccesible", ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
            }

        } catch (Exception e) {
            throw new ServiceException("Exception", e.getMessage(), ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
        }
        return Response.status(Response.Status.OK).build();
    }

    @DELETE
    @Path("/{userId}")
    public Response revokeAssistance(@PathParam("userId") String userId) throws ServiceException
    {
        try {
            String response = OpenfireConnection.revokeAssistance(userId);

            if (response != null)
            {
                throw new ServiceException(response, response, ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
            }

        } catch (Exception e) {
            throw new ServiceException("Exception", e.getMessage(), ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
        }

        return Response.status(Response.Status.OK).build();
    }

    @GET
    @Path("/upload/{userId}/{fileName}/{fileSize}")
    public String uploadRequest(@PathParam("userId") String userId, @PathParam("fileName") String fileName, @PathParam("fileSize") String fileSize) throws ServiceException
    {
        try {
            JSONObject response = OpenfireConnection.getUploadRequest(userId, fileName, Long.parseLong(fileSize));

            if (response.has("error"))
            {
                throw new ServiceException("Exception", response.getString("error"), ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
            }

            return response.toString();

        } catch (Exception e) {
            throw new ServiceException("Exception", e.getMessage(), ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
        }
    }

    @GET
    @Path("/uport/{appId}/{clientId}")
    public String getSigner(@PathParam("appId") String appId, @PathParam("clientId") String clientId) throws ServiceException
    {
        Log.info("getSigner uport.clientid." + appId + "." + clientId);

        try {
            String signer = JiveGlobals.getProperty("uport.clientid." + appId + "." + clientId);

            Log.info("gotSigner " + signer);

            if (signer == null || signer.equals(""))
            {
                throw new ServiceException("Exception", "client Id not found", ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
            }

            return signer;

        } catch (Exception e) {
            throw new ServiceException("Exception", e.getMessage(), ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
        }
    }

    @POST
    @Path("/uport/register")
    public String uportRegister(String json) throws ServiceException
    {
        Log.debug("uportRegister\n" + json);

        JSONObject response = new JSONObject();

        Connection con = null;
        PreparedStatement pstmt = null;
        ResultSet rs = null;
        UserManager userManager = UserManager.getInstance();

        try {
            JSONObject uportCreds = new JSONObject(json);

            if (uportCreds.has("address") && uportCreds.has("name") && uportCreds.has("publicKey"))
            {
                String email = uportCreds.has("email") ? uportCreds.getString("email") : null;
                String password = StringUtils.randomString(32);
                String finalUsername = null;
                User user = null;

                con = DbConnectionManager.getConnection();
                pstmt = con.prepareStatement("SELECT username FROM ofUserProp WHERE propValue=?");
                pstmt.setString(1, uportCreds.getString("address"));

                rs = pstmt.executeQuery();

                if (!rs.next())
                {
                    String[] parts = uportCreds.getString("name").split(" ");
                    String username = parts[0].toLowerCase().trim();

                    if (parts.length > 1)
                    {
                        username = username + "." + parts[1].toLowerCase().trim();
                    }
                    boolean ok = false;
                    finalUsername = username;
                    int count = 0;

                    while (!ok)
                    {
                        try {
                            userManager.getUser(finalUsername);
                            finalUsername = username + "-" + String.valueOf(++count);

                        } catch (UserNotFoundException e) {
                            ok = true;
                        }
                    }

                    user = userManager.createUser(finalUsername, password, uportCreds.getString("name"),  email);

                    user.getProperties().put("etherlynk.address", uportCreds.getString("address"));
                    user.getProperties().put("etherlynk.account", uportCreds.getString("account"));
                    user.getProperties().put("etherlynk.public.key", uportCreds.getString("publicKey"));

                } else {
                    finalUsername = rs.getString(1);

                    if (uportCreds.has("password"))
                    {
                        user = userManager.getUser(finalUsername);
                        AuthFactory.authenticate(finalUsername, uportCreds.getString("password"));

                        user.setPassword(password);
                        user.setName(uportCreds.getString("name"));
                        if (email != null) user.setEmail(email);
                    }
                }

                if (uportCreds.has("avatar")) user.getProperties().put("etherlynk.avatar", uportCreds.getJSONObject("avatar").getString("uri"));
                if (uportCreds.has("country")) user.getProperties().put("etherlynk.country", uportCreds.getString("country"));
                if (uportCreds.has("phone")) user.getProperties().put("etherlynk.phone", uportCreds.getString("phone"));

                response.put("username", finalUsername);
                response.put("password", password);

            } else {
                Log.error("bad request\n" + uportCreds);
                throw new ServiceException("Exception", "bad request", ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
            }

        } catch (Exception e) {
            Log.error("uportRegister execption", e);
            throw new ServiceException("Exception", e.getMessage(), ExceptionType.ILLEGAL_ARGUMENT_EXCEPTION, Response.Status.BAD_REQUEST);
        } finally {
            DbConnectionManager.closeConnection(rs, pstmt, con);
        }

        return response.toString();
    }
}
