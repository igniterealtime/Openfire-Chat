package org.ifsoft.sms;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import java.util.*;
import java.util.concurrent.*;
import javax.servlet.*;
import javax.servlet.http.*;
import java.io.*;
import java.nio.file.*;

import org.jivesoftware.openfire.plugin.rest.RESTServicePlugin;
import org.jivesoftware.util.*;

import net.sf.json.*;

import com.nexmo.client.NexmoClient;
import com.nexmo.client.auth.AuthMethod;
import com.nexmo.client.auth.TokenAuthMethod;
import com.nexmo.client.sms.messages.TextMessage;
import com.nexmo.client.sms.SmsSubmissionResult;

public class Servlet extends HttpServlet
{
    private static final Logger Log = LoggerFactory.getLogger( Servlet.class );

    public static void smsOutgoing(String destination, String source, String body)
    {
        String NEXMO_API_KEY = JiveGlobals.getProperty("nexmo.api.key", "ae9a4714");
        String NEXMO_API_SECRET = JiveGlobals.getProperty("nexmo.api.secret", "uvyh3PU2VEbzpiJH");

        ExecutorService executor = Executors.newCachedThreadPool();

        executor.submit(new Callable<Boolean>()
        {
            public Boolean call() throws Exception
            {
                try {
                    AuthMethod auth = new TokenAuthMethod(NEXMO_API_KEY, NEXMO_API_SECRET);
                    NexmoClient client = new NexmoClient(auth);

                    SmsSubmissionResult[] responses = client.getSmsClient().submitMessage(new TextMessage(source, destination, body));

                    for (SmsSubmissionResult resp : responses)
                    {
                        Log.info("smsOutgoing " + resp);
                    }

                    String NEXMO_WAIT = JiveGlobals.getProperty("nexmo.api.wait", "1000");

                    try {
                        int wait = Integer.parseInt(NEXMO_WAIT);
                        Thread.sleep(wait);

                    } catch (Exception e) {
                        Log.error("smsOutgoing", e);
                    }

                } catch (Exception e) {
                    Log.error("smsOutgoing", e);
                }
                return true;
            }
        });
    }

    @Override
    protected void doGet( HttpServletRequest request, HttpServletResponse response )
    {
        Map<String, String[]> parameters = request.getParameterMap();
        JSONObject sms = new JSONObject();

        try {
            for(String parameter : parameters.keySet())
            {
                String[] values = parameters.get(parameter);
                sms.put(parameter, values[0]);

                Log.info("smsIncoming " + parameter + "=" + values[0]);
            }

            RESTServicePlugin.smsIncoming(sms);

        } catch (Exception e) {
            Log.error("smsIncoming", e);
        }
    }
}