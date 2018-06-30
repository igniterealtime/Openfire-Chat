var TL_MessageBlast={};

TL_MessageBlast.Request = ( function() {

    function Init(){

        console.log("Hello TL_MessageBlast Request");
    }


    function Makerequest(mode,resturi,callback,jsontosend, data){
        console.log("Makerequest", mode,resturi,jsontosend, data);

        function reqListener () {
          var responsejson = {};

          if (this.status === 200) {

            if (this.responseText && this.responseText != "") {
                responsejson = JSON.parse(this.responseText);
            }

            console.log("reqListener", responsejson, data);
            if (callback) callback(responsejson, data);

          }
          else {
             // console.log("Error",this.status, this.statusText);
             var warningmessage = ""

             if(oReq.responseText!=undefined){
                var parsedresptext = JSON.parse(oReq.responseText)
                if(parsedresptext.message!=undefined){
                   warningmessage = parsedresptext.message
                }
             }
             TL_MessageBlast.Newblast.warningdialog("Error "+oReq.status,oReq.statusText+" "+warningmessage)
          }

        }

        var oReq = new XMLHttpRequest();
        oReq.addEventListener("load", reqListener);
        oReq.open(mode, location.protocol + "//" + location.host + "/rest/api/restapi/v1/"+resturi);
        oReq.setRequestHeader('Authorization', "Basic " + config.authorization );
        oReq.setRequestHeader('Accept', 'application/json' );
        oReq.setRequestHeader("Content-Type", "application/json");

        oReq.setRequestHeader('Cache-control', 'no-cache');
        oReq.setRequestHeader('Cache-control', 'no-store');
        oReq.setRequestHeader('Pragma', 'no-cache');
        oReq.setRequestHeader('Expires', '0');

        oReq.onreadystatechange = function (oEvent) {
            if (oReq.readyState === 4) {
                if (oReq.status < 400) {

                } else {
                   console.log("Error",oReq.status, oReq.statusText);

                   var warningmessage = ""
                   if(oReq.responseText!=undefined){
                      var parsedresptext = JSON.parse(oReq.responseText)
                      if(parsedresptext.message!=undefined){
                         warningmessage = parsedresptext.message
                      }
                   }
                   TL_MessageBlast.Newblast.warningdialog("Error "+oReq.status, oReq.statusText+" "+warningmessage)
                }
            }
        };
        oReq.send(jsontosend);
    }






    return {
               init:Init,
        makerequest:Makerequest
    };

} ( TL_MessageBlast.Request || {} ));
