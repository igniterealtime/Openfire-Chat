TL_MessageBlast.Sent = ( function() {

    var lastjsonrecieved;

    function Init(){

        console.log("Hello TL_MessageBlast Sent");

        var sentsearch = document.getElementById("sentsearch")
        var cancelbut = sentsearch.parentNode.getElementsByClassName("ms-CommandButton-button")[0];

        cancelbut.addEventListener("click", function(e){
            TL_MessageBlast.Sent.refreshsent()
        })


        sentsearch.addEventListener("input", function(e){

            console.log("sentsearch",e.target.value)

            // var matches=[];
            var sentmessagescontent = document.getElementById("sentmessagescontent");
            sentmessagescontent.innerHTML = "";

            for (var i = 0; i < lastjsonrecieved.sentblast.length; i++) {
              if(lastjsonrecieved.sentblast[i].title!=undefined){
                if(lastjsonrecieved.sentblast[i].title.indexOf(e.target.value)!=-1){
                    updatehtmllist(lastjsonrecieved.sentblast[i])
                }
              }
            };

        });


        document.getElementById("sellectlist").addEventListener("click", function(e){

            var sentlisttr = document.getElementById("sentmessagescontent").getElementsByTagName("tr");
            
            if(sentlisttr[0].className=="is-selected"){
                for (var i = 0; i < sentlisttr.length; i++) {
                    sentlisttr[i].className="";
                }
            }
            else{
                for (var i = 0; i < sentlisttr.length; i++) {
                    sentlisttr[i].className="is-selected";
                }
            };
        })


    }


    function Refreshsent(){
        lastjsonrecieved=[];
        var sentmessagescontent = document.getElementById("sentmessagescontent");
        sentmessagescontent.innerHTML = "";
        TL_MessageBlast.Request.makerequest("GET","messageblast/sentblasts", TL_MessageBlast.Sent.updatesentlist );
    }


    function Updatesentlist(responsejson){

        //console.log("TL_MessageBlast Sent",responsejson)
        if(isEmpty(responsejson)==false){

            if (responsejson.sentblast instanceof Array)
            {
                responsejson.sentblast.sort(function (a, b) {
                      return b.sentDate.replace( /[/:\s]/g ,"") - a.sentDate.replace( /[/:\s]/g ,"");
                });
                lastjsonrecieved=responsejson;

                for (var i = 0; i < responsejson.sentblast.length; i++) {
                    updatehtmllist(responsejson.sentblast[i])
                };
            }
            else{
                lastjsonrecieved.sentblast=[]
                lastjsonrecieved.sentblast.push(responsejson.sentblast)
                updatehtmllist(responsejson.sentblast)
            }

        }
    }


    function updatehtmllist(resp){

        var tr = document.createElement("tr");
        // tr.className="";
		    var unreadCount = resp.recipientsCount - resp.readCount;

        if(resp.completed==true){

        }else{
          var statusfield = resp.recieveCount+' of '+resp.recipientsCount;
        }

        var temp=
          '<td class="ms-Table-rowCheck"></td>'+
          '<td class="onelinetext">'+resp.title+'</td>'+
          '<td class="link">'+resp.readCount+'</td>'+
          '<td class="link">'+unreadCount+'</td>'+
          '<td class="link">'+resp.respondCount+'</td>'+
          '<td class="link">'+resp.errorCount+'</td>'+
          '<td class="nowrap">'+formatdate(resp.sentDate)+'</td>';

        tr.id=resp.id
        tr.innerHTML=temp;
        tr.data=resp

        var sentmessagescontent = document.getElementById("sentmessagescontent")
        sentmessagescontent.appendChild(tr)

        var sentdetail1 = document.getElementById("sentdetail1");


        tr.childNodes[1].addEventListener("click", function(e){
          console.log("click sent title = ",this.parentNode.data)
          tr.className=""
          TL_MessageBlast.Inbox.refreshInbox(this.parentNode.data.messageBlastEntity.sender, this.parentNode.data.id,"replies")
        })


        tr.childNodes[2].addEventListener("click", function(e){
          console.log("click Delivered list = ",this.parentNode.data)
          TL_MessageBlast.Inbox.refreshInbox(this.parentNode.data.messageBlastEntity.sender, this.parentNode.data.id,"read")
        })


        tr.childNodes[3].addEventListener("click", function(e){
          console.log("click read list = ",this.parentNode.data)
          TL_MessageBlast.Inbox.refreshInbox(this.parentNode.data.messageBlastEntity.sender, this.parentNode.data.id,"unread")
        })

        tr.childNodes[4].addEventListener("click", function(e){
          console.log("click read list = ",this.parentNode.data)
          TL_MessageBlast.Inbox.refreshInbox(this.parentNode.data.messageBlastEntity.sender, this.parentNode.data.id,"responded")
        })

        tr.childNodes[5].addEventListener("click", function(e){
          console.log("click read list = ",this.parentNode.data)
          TL_MessageBlast.Inbox.refreshInbox(this.parentNode.data.messageBlastEntity.sender, this.parentNode.data.id,"error")
        })



        tr.addEventListener("click", function(e){


          console.log("click sent id = ",this.data, e)

          sentdetail1.innerHTML = "<div class='nowrap'>Message Id: "+ this.data.id+"</div>"+
                                "<div class='nowrap'>Title: "+ this.data.messageBlastEntity.title+"</div>"+
                                "<div class='nowrap'>Message: "+ this.data.messageBlastEntity.message+"</div>";


          if(e.target.className=="ms-Table-rowCheck"){
             if(this.className=="is-selected"){
                  this.className=""
             }else{
                this.className="is-selected"
             }
          }


        //    //update chart
           var sentdetail2 = document.getElementById("sentdetail2").innerHTML="<canvas id='myChart'></canvas>";
           var ctx = document.getElementById("myChart").getContext('2d');
            var myChart = new Chart(ctx, {
              type: 'pie',
              data: {
                labels: ["Read", "Unread",  "Errors"],
                datasets: [{
                  backgroundColor: [
                    "#2ecc71",
                    "#c6ab26",
                    "#e74c3c"
                  ],
                  // data: [12, 19, 3, 17]
                  data: [this.data.readCount, this.data.recipientsCount-this.data.readCount, this.data.errorCount]
                }]
              },
              options: {
                cutoutPercentage: 50,
                animation: {
                  duration: 1000
                }
              }
            });

        })

    }


    function Removesent(){

        var sentmessagescontent = document.getElementById("sentmessagescontent");
        var checked = sentmessagescontent.querySelectorAll('.is-selected');
        for (var i = 0; i < checked.length; i++) {
          var tickedcronid = checked[i].id
          console.log("checked", tickedcronid, checked[i].data.messageBlastEntity.sender);

          if(i==checked.length-1){
             TL_MessageBlast.Request.makerequest("DELETE","messageblast/sentblasts/"+checked[i].data.messageBlastEntity.sender+"/"+tickedcronid, TL_MessageBlast.Sent.refreshsent );
          }else{
             TL_MessageBlast.Request.makerequest("DELETE","messageblast/sentblasts/"+checked[i].data.messageBlastEntity.sender+"/"+tickedcronid);
          }
              
        };


    }
    

    return {
                               init:Init,
                     updatesentlist:Updatesentlist,
                        refreshsent:Refreshsent,
                         removesent:Removesent
    };

} ( TL_MessageBlast.Sent || {} ));