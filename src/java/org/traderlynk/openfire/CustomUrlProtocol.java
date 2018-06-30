/**
 * $Revision $
 * $Date $
 *
 * Copyright (C) 2005-2010 Jive Software. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.traderlynk.openfire;

import org.jivesoftware.util.*;

import org.slf4j.*;
import org.slf4j.Logger;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.ServletOutputStream;

import java.io.*;
import java.net.*;
import java.util.*;
import java.text.*;

import org.jivesoftware.openfire.XMPPServer;
import org.jivesoftware.util.*;


public class CustomUrlProtocol  extends HttpServlet
{
    private static final Logger Log = LoggerFactory.getLogger(CustomUrlProtocol.class);
	public static final long serialVersionUID = 24362462L;

	public void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {

		try {
			String url = request.getParameter("url");
			Log.info("CustomUrlProtocol - doGet rest " + url);
			response.setStatus(204);

			String verb = null;

			if (url.contains("web el:put/") || url.contains("web+el:put/")) verb = "PUT";
			if (url.contains("web el:post/") || url.contains("web+el:post/")) verb = "POST";
			if (url.contains("web el:delete/") || url.contains("web+el:delete/")) verb = "DELETE";

			if (verb != null)
			{
				String newUrl = "/rest/api/restapi/v1/" + url.substring(7 + verb.length() + 1);

				String token = request.getHeader("authorization");
				doRest(newUrl, verb, token);
			}
		}
		catch(Exception e) {
			Log.info("CustomUrlProtocol doGet Error: " + e.toString());
		}
	}


   private void doRest(String urlToSend, String verb, String token)
   {
	  Log.info("CustomUrlProtocol - doRest " + urlToSend);

      URL url;
      HttpURLConnection conn;

      try {
         url = new URL("http://" + XMPPServer.getInstance().getServerInfo().getHostname() + ":" + JiveGlobals.getProperty("httpbind.port.plain", "7070") + urlToSend);
         conn = (HttpURLConnection) url.openConnection();
         conn.setReadTimeout(60 * 1000);
         conn.setConnectTimeout(60 * 1000);
		 if (token != null) conn.setRequestProperty ("Authorization", token);
         conn.setRequestMethod(verb);
		 conn.getResponseCode();

      } catch (Exception e) {
         Log.error("doRest", e);
      }
	}
}
