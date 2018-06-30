TL_MessageBlast.Pending = ( function() {

    var lastjsonrecieved=[];

    function Init(){

        console.log("Hello TL_MessageBlast Pending");       

        var pendingsearch = document.getElementById("pendingsearch")
        var cancelbut = pendingsearch.parentNode.getElementsByClassName("ms-CommandButton-button")[0];

        cancelbut.addEventListener("click", function(e){
            TL_MessageBlast.Pending.refreshsent();
        })
       
        var selectall = document.getElementById("selectall")
        selectall.addEventListener("click", function(e){

            
            
        var pendingmessagestr = document.getElementById("pendingmessagescontent").getElementsByTagName("tr");
        
        if(pendingmessagestr[0].className=="is-selected"){
            for (var i = 0; i < pendingmessagestr.length; i++) {
                pendingmessagestr[i].className="";
            }
        }
        else{
            for (var i = 0; i < pendingmessagestr.length; i++) {
                pendingmessagestr[i].className="is-selected";
            }
        };

        })

        pendingsearch.addEventListener("input", function(e){
          
            console.log("pendingsearch",e.target.value)
            
            var pendingmessagescontent = document.getElementById("pendingmessagescontent");
            pendingmessagescontent.innerHTML = "";

            for (var i = 0; i < lastjsonrecieved.blast.length; i++) {
              if(lastjsonrecieved.blast[i].title!=undefined){
                if(lastjsonrecieved.blast[i].title.indexOf(e.target.value)!=-1){
                    updatehtmllist(lastjsonrecieved.blast[i]);
                }
              }
            };
        });
    }



    function Refreshsent(){
        lastjsonrecieved=[];
        var pendingmessagescontent = document.getElementById("pendingmessagescontent");
        pendingmessagescontent.innerHTML = "";
        TL_MessageBlast.Request.makerequest("GET","messageblast/blasts", TL_MessageBlast.Pending.updatesentlist );
    }


    function Updatesentlist(responsejson){

        //console.log("TL_MessageBlast Sent",responsejson)
        if(isEmpty(responsejson)==false){


            if (responsejson.blast instanceof Array)
            {
                // responsejson.blast.sort(function (a, b) {
                //       return b.sentDate.replace( /[/:\s]/g ,"") - a.sentDate.replace( /[/:\s]/g ,"");
                // });
                lastjsonrecieved=responsejson;

                for (var i = 0; i < responsejson.blast.length; i++) {
                    updatehtmllist(responsejson.blast[i]);
                };
            }
            else{
                lastjsonrecieved.blast=[];
                lastjsonrecieved.blast.push(responsejson.blast);
                updatehtmllist(responsejson.blast);
            }
        
        }


    }


    function updatehtmllist(resp){

        var tr = document.createElement("tr");


        var temp=
          '<td id="selectall" class="ms-Table-rowCheck"></td>'+
          '<td>'+resp.title+'</td>'+
          '<td>'+resp.message+'</td>'+
          // '<td>'+resp.sendlater+ '</td>'+

          '<td>'+resp.cronjob+'</td>';

        tr.innerHTML=temp;
        tr.setAttribute("data-cronjob",resp.cronjob)

        tr.addEventListener("click", function(e){
             if(this.className=="is-selected"){
                this.className=""
             }else{
                this.className="is-selected"
             }
        })
        var pendingmessagescontent = document.getElementById("pendingmessagescontent")
        pendingmessagescontent.appendChild(tr)

    }

    
    function Removepending(){

        var pendingmessagescontent = document.getElementById("pendingmessagescontent");
        var checked = pendingmessagescontent.querySelectorAll('.is-selected');
        for (var i = 0; i < checked.length; i++) {
          var tickedcronid = checked[i].dataset.cronjob
          console.log("checked", tickedcronid);

          if(i==checked.length-1){
            TL_MessageBlast.Request.makerequest("DELETE","messageblast/blasts/"+tickedcronid, TL_MessageBlast.Pending.refreshsent );
          }else{
            TL_MessageBlast.Request.makerequest("DELETE","messageblast/blasts/"+tickedcronid);
          }

        };


    }
    



    
    return {
                     init:Init,
           updatesentlist:Updatesentlist,
              refreshsent:Refreshsent,
            removepending:Removepending
    };
  
} ( TL_MessageBlast.Pending || {} ));