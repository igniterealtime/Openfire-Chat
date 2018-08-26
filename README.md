# Overview
## Chat API (Rest API + SSE)
Representational state transfer (REST) has now become the standard for abstracting request/response type web services into an API. When it is combined with Server Sent Events (otherwise known as Event Source), the result is a fresh new way of proving two-way real-time communication between web clients and a server using synchronous requests/responses (IQ) with REST and asynchronous evening (Message, Presence) with SSE.

The [Rest API plugin by Redor](https://igniterealtime.org/projects/openfire/plugins/restapi/readme.html) is very powerful support tool for Openfire. It allows you to administer Openfire via a RESTful API. Most of the common functions we do from the Openfire admin console web application can now be automated and integrated into server-side Java plugins or client-side web applications with ease. 

This plugin runs on the HTTP-BIND (7070/7443) port in contrast to the REST API plugin which runs on the admin (9090/9091) port. It authenticates Openfire user credentials. It supports the REST API plus Bookmarks and SIP Accounts as an admin user and enables a normal user to handle presence, chat, groupchat, meetings, contacts and users with just a handful of REST requests and SSE events.

# How to use
The chat api can be used server-side from a web application with a single master password/secret on most HTTP requests. This can also be used when there is a middleware proxy web-server between Openfire and the web client like nodejs. This is required when admin type requsts are made. Otherwise, the web client can use the credentials for the openfire user to perform excluse requests for that user only. For security, avoid exposing the master password/secret to the web client.

Asynchronous push events from the server for handling chat, groupchat audio, video and telephone conversations can be received as SSE events or as JSON messages over a SIP connection if the openfire ofswitch plugin is enabled and the user has a SIP websocket connection opened. See ofswitch plugin for more details.

A fully functional swagger UI for the chat api can be found on your openfire server at http://your_server:9090/plugins/ofchat/swagger-ui-sandbox.jsp. It has the documentation of each chat api endpoint and can be used to test the endpoint request against your working openfire server.


# REST Endpoint Summary
## broadcast own presence
POST /chat/presence<br/>
## seach for domain users
GET /chat/users<br/>
## retrieve,add,remove contacts
GET /chat/contacts<br/>
POST /chat/contacts/{contactJID}<br/>
DELETE /chat/contacts/{contactJID}<br/>
## retrieve old messages and post new message
GET /chat/messages<br/>
POST /chat/messages/user@domain<br/>
## retrieve, join, post messages, invite and leave muc rooms
GET /chat/rooms<br/>
PUT /chat/rooms/{roomName}<br/>
POST /chat/rooms/{roomName}<br/>
POST /chat/rooms/{roomName}/{contactJID}<br/>
DELETE /chat/rooms/{roomName<br/>
## create/update own user profile properties
POST /chat/users/{propertyName}<br/>
## delete own user profile properties
DELETE /chat/users/{propertyName}<br/>
## send a raw XMPP message to openfire
POST /chat/xmpp<br/>

# User cases
## How to login and logoff
In order to send and receive chat messages for a specific user using the realtime server, a stream needs to be created. 
To login, use the login chat api endpoint with no payload. The password is not required.
````
POST /restapi/v1/chat/{username}/login
````
This will return the active streamid for this user's xmpp session

To logoff, use the logoff chat api endpoint
````
POST /restapi/v1/chat/{streamid}/logoff
````
## How to send and receive one-to-one chat messages
In order to send a message, the stream-id of the sender and the destination address of the recipient are needed. If your domain is ingiterealtime.org, then the **destination** address of a username is username@ingiterealtime.org.
To send a chat message, first format a json object that looks like this:
````
{
   "body" : "desired message"
}  
````
Add any extra data needed to the json object and use the chat api messages endpoint with the json object as text.
````
POST /restapi/v1/chat/{streamid}/messages/{destination}
````
To receive a one-to-one chat message, ensure you have an SSE connection created on the web client and a handler coded to handle the expected JSON messages. See https://your_server:7443/apps/sse/index.html for an example on how to do this.
With the handler in place, incoming message data will look like this
````
{
   'type':'chat',
   'body':'hello',
   'to':'user@domain',
   'from':'user@domain',
   'data': {}
}
````

## How to broadcast and receive presence messages
To broadcast a user presence to all following and followed users, use the chat API presence endpoint.
````
POST /restapi/v1/chat/{streamid}/presence?show=dnd&status=very%20busy
````
Incoming presence events from followers and following will arrive on the SSE channel and will look like this
````
{
    "from": :"expert@ingiterealtime.org/converse.js-124258854",
    "show": "dnd",
    "status": "I am working hard",
    "to": "visitor@ingiterealtime.org",
    "type": "presence"
}
````

## How to use fastpath with the chat api
In order to use fastpath, an understanding of the roles and responsibilities of all participants is needed.

### Roles
<b>User</b> - The user requests a private conversation with a topic expert from a workgroup. The chat api receives and sends messages with the workgroup using the topic name. The topic name represents a general contact address which allows users to find topic experts to talk to without the need to know any particular expert's individual address. The chat api manages the interactions between users and experts.
<b>Expert</b> is a member of the topic workgroup and can carry out conversations with users relating to that particular topic. Experts can belong to multiple topic workgroups at the same time.

### Responsibilities
Each participant is responsible for certain actions when using the chat expert queue client api.

<b>Users should:</b>
* Know the status of the workgroup queue before requesting a conversation. This information allows users to see if the workgroup is open or closed.
* Know the status of their request while in the request queue.
* Be able to cancel a chat request at any time.

<b>Workgroup agents should:</b>
* Assume the expert queue is always open.
* Be able to accept or reject chat requests.
* Indicate their availability for handling workgroup chats.

<b>The chat expert queue api:</b>
* Controls the topic workgroup request queue(s).
* Manages the updating of queue status information.
* Determines how users are queued and how queue requests are routed to experts. The queue routing algorithm is simple round-robin.

## User State Transitions
Users join an expert queue to wait for a chat with an expert. Once they have joined the queue, they may receive zero or more status updates as events from the client api informing them of their status in the queue. Users have the option to cancel their chat request at any time.
````
              +-------+
              | Start |<------+
              +-------+       |
                  |           |
                  | Join      |
                  v           |
             +---------+      |
      +----->| Queued  |      |
      |      +---------+      |
      | Status |  |  | Leave  |
      +--------+  |  +--------+
                  |
                  | Invitation
                  v
            +-----------+
            | Chat room |
            +-----------+
````    
## Expert State Transitions
Experts join topic workgroup queues automatically during sign-in by the realtime api. The expert will can start to receive offers to chat with users immediately. Chat offers will be made to the expert and the expert has the opportunity to accept or reject each offer. The realtime api may also revoke an offer. For example, the realtime server may revoke chat offers if the offer is not responded to within a certain period of time to ensure fast responses to user chat requests.

````
              +-------+
              | Start |<---------+
              +-------+          |
                  |              |
                  | Offer        |
                  v              |
            +---------------+    |
            | Offer Pending |    |
            +---------------+    |
                 |  |  | Revoke  |
                 |  |  +-------->|
                 |  | Reject     |
          Accept |  +----------->|
                 v               |
            +--------------+     |
            | Chat Pending |     |
            +--------------+     |
                 |   | Revoke    |
          Invite |   +-----------+
                 V
              +-----------+
              | Chat room |
              +-----------+
````
### User and Expert Actions
1. Code a handler to handle asynchronous events that are pushed over the SSE connection for both user and expert. 
2. User can ask a question. First construct a JSON object for the request. It should contain at least the following parameters. Additional data can be added as needed.
````
    {
      "emailAddress": "visitor@hospital.com",
      "userID": "visitor",
      "question": "What is the meaning of life",
      "workgroup": "diabetes"
    }
````
Then use the chat api ask endpoint with the json object
````
POST /restapi/v1/ask
````

3. Expert will be offered the question. This will appear as a JSON event that will look like this.
````
{
  "type": "offerReceived", 
  "workgroup":"diabetes@workgroup.ingiterealtime.org", 
  "id":"fhrtbf7", 
  "from":"visitor@ingiterealtime.org/dele2", 
  "metaData": {"question":"what is the meaning of life","email":"visitor@hospital.com","username":"visitor"}
}
````
Expert must either accept or reject the offer.
To accept the offer, expert uses chat api assists endpoint with a PUT
````
PUT /restapi/v1/chat/assists/{workgroup}/{offerId}
`````
To reject the offer the expert uses the chat api assist endpoint with a DELETE
````
DELETE /restapi/v1/chat/assists/{workgroup}/{offerId}
````

4. If the expert rejects the offer, it is passed on to the next agent/expert in the workgroup. If that expert accepts, then fastpath will create a conference room for the chat/conversation and send an async event to both the users and the accepting expert with the details. The expert will receive a JSON event that looks like this
````
{
    "type": "invitationReceived", 
    "password":"null", 
    "room":"fhrtbf7@conference.ingiterealtime.org", 
    "inviter":"diabetes@workgroup.ingiterealtime.org", 
    "to":"expert@ingiterealtime.org/expert-1517855155225", 
    "from":"fhrtbf7@conference.ingiterealtime.org", 
    "url":"https://ingiterealtime.org:7443/ofmeet/r/fhrtbf7", "reason": "fhrtbf7"
}
````
The room name is the string before the "@" in the room address. In this example, fhrtbf7

The user will receive a JSON event that looks like this
````
{
    "type": "offer", "to":"dele2@ingiterealtime.org", 
    "from":"fhrtbf7@conference.ingiterealtime.org", 
    "url":"https://ingiterealtime.org:7443/ofmeet/r/fhrtbf7", 
    "mucRoom": "fhrtbf7@conference.ingiterealtime.org"
}
```` 
Again, the room name is the string before the "@" symbol in the from or mucRoom.

5. The expert and visitor are now ready to chat with each other in the chat room. A chat room is used instead of a one-to-one chat in order to allow a multi-user conference for the following reasons.
* Allowing more than one expert to join the conversation (useful for bringing in external experts to join the conversation).
* Allowing topic managers to monitor conversations for quality of service.
* Allowing a convenient mechanism for bringing 'chatbot' services into the conversation (e.g. answering FAQs).

To send a chat message to the chat room, first format a json object that looks like this:
````
{
   "body" : "desired message",
   "extra": "extra data"
}  
````
Add any extra data needed to the json object and use the chat api rooms endpoint to post a message to the chat room with the json object as text
````
POST /restapi/v1/chat/rooms/{roomName}?service="conference"
````

To receive chat messages listen for the this JSON message
````
{
    "type": "groupchat", 
    "to":"diabetes@ingiterealtime.org/dele1-1517855155225", 
    "from":"fhrtbf7@conference.ingiterealtime.org/dele1", 
    "body": "desired message",
    "data": {"body" : "desired message", "extra": "extra data"}
}
```` 
Use the other chatroom REST endpoints to leave, add or invite other experts to the conversation.
