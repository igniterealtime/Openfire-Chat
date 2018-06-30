TL_MessageBlast.Inbox = ( function() {

    // var lastjsonrecieved;
    var lastsender;
    var lastid;
    var lasttype;
    var start=1;
    //how many to return -1
    var count=100;
    // var testcount=0;

    
    function Init(){
        console.log("Hello TL_MessageBlast Inbox");

        var inboxsearch = document.getElementById("sentsearch")
        var cancelbut = sentsearch.parentNode.getElementsByClassName("ms-CommandButton-button")[0];
        var sentincommingpanelscroller = document.getElementById("sentincommingpanelscroller")

       
        cancelbut.addEventListener("click", function(e){
                console.log("cancel inbox search",e.target.value)
                var inbox = document.getElementById("inboxlist").innerHTML="";
                var url = "messageblast/sentblasts/" + lastsender +"/"+lastid+"?type="+lasttype;
                TL_MessageBlast.Request.makerequest("GET", url, TL_MessageBlast.Inbox.updateInbox, null, [lastsender,lasttype] );
        })
        
        
        inboxsearch.addEventListener("input", function(e){
            if(lastsender!=undefined){   
                if(e.target.value.length>2){
                    if(lasttype=="replies"){
                        lasttype="";
                    }
                    console.log("inboxsearch",e.target.value)
                    var inbox = document.getElementById("inboxlist").innerHTML="";
                    var url = "messageblast/sentblasts/" + lastsender +"/"+lastid+"?type="+lasttype+"&filter="+e.target.value;
                    TL_MessageBlast.Request.makerequest("GET", url, TL_MessageBlast.Inbox.updateInbox, null, [lastsender,lasttype] );
                }
            }
        });

        sentincommingpanelscroller.onscroll = function(ev) {
            // console.log("sentincommingpanelscroller scrolling",sentincommingpanelscroller.scrollHeight ,Math.round(sentincommingpanelscroller.scrollTop+sentincommingpanelscroller.offsetHeight)+1)


            if ( Math.round(sentincommingpanelscroller.scrollTop + sentincommingpanelscroller.offsetHeight+1) > sentincommingpanelscroller.scrollHeight) {
                start=start+(count+1);
                // you're at the bottom of the page
                console.log("sentincommingpanelscroller now at bott")
                RefreshInbox(undefined,undefined,undefined,start)
                sentincommingpanelscroller.scrollTo(0, 1);
            }

            // if(sentincommingpanelscroller.scrollTop==0){
            //     console.log("Scrolled to top!!!!")
            //     start=start-(count+1);
            //     RefreshInbox(undefined,undefined,undefined,start)
            //     sentincommingpanelscroller.scrollTo(0, 1);
            // }
        };
    }


    function RefreshInbox(sender,id,type,startval){
        
        if(sender!=undefined){
            lastsender=sender;
            lastid=id;
            lasttype=type;
            start=1;
            count=100;
        }else{
            sender=lastsender;
            id=lastid;
            type=lasttype;
            start=startval;
        }

        var inboxList = document.getElementById("inboxlist");

        if(start==1){
            inboxList.innerHTML = "";
        }
       
        var backgroundcol="#ccc;"

        switch(type) {
            case "read":
                var url = "messageblast/sentblasts/" + sender +"/"+id+"?type=read"+"&start="+start+"&count="+count;
                backgroundcol="#2ecc71"
                var thistitle="Read"
                break;
             case "unread":
                var url = "messageblast/sentblasts/" + sender +"/"+id+"?type=unread"+"&start="+start+"&count="+count;
                backgroundcol="#c6ab26"
                var thistitle="Unread"
                break;
            case "responded":
                var url = "messageblast/sentblasts/" + sender +"/"+id+"?type=responded"+"&start="+start+"&count="+count;
                backgroundcol="#3498db"
                var thistitle="Responded"
                break;
            case "error":
                var url = "messageblast/sentblasts/" + sender +"/"+id+"?type=error"+"&start="+start+"&count="+count;
                backgroundcol="#e74c3c"
                var thistitle="Errors"
                break;
            default:
                var url = "messageblast/sentblasts/" + sender +"/"+id+"?start="+start+"&count="+count;
                backgroundcol="#ccc"
                var thistitle="Sent"
               
        }

        console.log("sender inbox", url, " type = ",type);
        
        var inboxtitle = document.getElementById("inboxtitle");
        inboxtitle.style.backgroundColor = backgroundcol;
        inboxtitle.innerHTML=thistitle;

        TL_MessageBlast.Request.makerequest("GET", url, TL_MessageBlast.Inbox.updateInbox, null, [sender,type] );
    }


  

    
    function UpdateInbox(json, sender){

        console.log("UpdateInbox Inbox", json,sender);
        


        if (json.group)
        {          
            if(!(json.group.user instanceof Array)){
               var toarray = [json.group.user]
               json.group.user = toarray
            }

            for (var i=0; i<json.group.user.length; i++)
            {   
                buildHTML(json.group.user[i], sender);
            }
  
        }
    }   
    

    function buildHTML(user, sender){

        //console.log("buildHTML", user);
        if(user!=undefined){

        
            if(user.name==undefined){

                var test = user.sipUri.indexOf("@")
                user.name=user.sipUri.slice(0,test);
            }

            var replyline= "";
            if(user.messageIn!=undefined){
                replyline = '<span class="ms-ListItem-tertiaryText">'+user.messageIn+'</span> ';
            }



            document.getElementById("noResponses").style = "display: none;"        

            // var temp= '<td class="nowrap '+user.presence+'"><i class="ms-Icon ms-Icon--Add"></i>'+user.name +'</td><td class="nowrap">'+user.sipUri +'</td>';  
            var pres = "ms-Icon--StatusErrorFull"
            if(user.presence=="online"){
                var pres = "ms-Icon--CompletedSolid"
            }


            var temp= '<td class="nowrap"><i title="'+user.presence+'" class="pres ms-Icon '+pres+'"></i>'+user.name +'</td><td class="nowrap">'+user.sipUri +'</td><td class="nowrap">'+timeelapsed(user.lastAttemptTimeStamp)+'</td><td class="nowrap">'+user.retriesLeft +'</td>';      


            var inbox = document.getElementById("inboxlist");
            var newli = document.createElement("tr");
            newli.data=user;
            newli.tabindex = "0";
            newli.innerHTML = temp
            inbox.appendChild(newli)



            newli.addEventListener("click", function(e){
                
                var sentdetail2 = document.getElementById("sentdetail2");

                var userstatus; 
                if(user.read=="true"){
                    userstatus="Read " 
                }
                if(user.responded=="true"){
                    userstatus=userstatus+"Responded "
                }

                if(user.messageIn){
                    sentdetail2.innerHTML="Reply from: "+user.name+"<br/>"+
                                      // "Reply Subject: "+user.subject+"<br/>"+
                                      "Reply Message: "+user.messageIn+"<br/>"+
                                      "Recipient: "+user.name+"<br/>"+
                                        "Sip URI: "+user.sipUri+"<br/>"+
                                        "Presence: "+user.presence+"<br/>"+
                                        "<i class='pres ms-Icon ms-Icon--GroupedAscending'></i> First attempted send: "+formatdate(user.firstAttemptTimeStamp)+'<br/>'+
                                        "<i class='pres ms-Icon ms-Icon--GroupedDescending'></i> Last attempted send: "+formatdate(user.lastAttemptTimeStamp)+"<br/>"+
                                        "Retries Left: "+user.retriesLeft+"<br/>"+
                                        "Status: "+userstatus;
                }else{
                    sentdetail2.innerHTML="Recipient: "+user.name+"<br/>"+
                                        "Sip URI: "+user.sipUri+"<br/>"+
                                        "Presence: "+user.presence+"<br/>"+
                                        "First attempted send: "+formatdate(user.firstAttemptTimeStamp)+"<br/>"+
                                        "Last attempted send: "+formatdate(user.lastAttemptTimeStamp)+"<br/>"+
                                        "Retries left: "+user.retriesLeft+"<br/>"+
                                        "Status: "+userstatus;
                }

                if(user.error=="true" || user.error==true){
                    sentdetail2.innerHTML="Recipient: "+user.name+"<br/>"+
                                        "Error: "+user.messageError;
                }

                var allinboxlis = inbox.getElementsByTagName("tr");

                for (var i = 0; i < allinboxlis.length; i++) {
                    allinboxlis[i].className="";
                };

                this.className="is-selected";
                console.log("inboxclick = ",this.data)
            })
        }
    } 

    
 
    
    return {
                       init:Init,
                updateInbox:UpdateInbox,
               refreshInbox:RefreshInbox
    };
  
} ( TL_MessageBlast.Inbox || {} ));