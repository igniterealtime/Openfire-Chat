TL_MessageBlast.Settings = ( function() {
  
    var presetvals=[{"title":"","message":""},{"title":"","message":""},{"title":"","message":""},{"title":"","message":""}];

    function Init(){
        console.log("Hello TL_MessageBlast Settings");
        var allpresetvals;
        var prebuttons = document.getElementById("presetmessagebuttons").getElementsByTagName("button");
        
        for (var i = 0; i < prebuttons.length; i++) {

            var titlefield=document.getElementById("presettitle"+(i+1))
            titlefield.addEventListener("blur", function(e){
                  // console.log("typing tit > ",this.id.slice(11) ,this.id, this.value);
                  presetvals[this.id.slice(11)-1]["title"]=this.value;
                  allpresetvals = JSON.stringify(presetvals);
                  // Saveprop("presetmessages",allpresetvals)
            });

            var messagefield=document.getElementById("presetmessage"+(i+1))
            messagefield.addEventListener("blur", function(e){
                  // console.log("typing > ",this.id.slice(13) ,this.id, this.value);
                  // presetvals[this.id.slice(13)-1]["message"]=this.value;
                  presetvals[this.id.slice(13)-1]["message"]=this.innerHTML;
                  allpresetvals = JSON.stringify(presetvals);
                  // Saveprop("presetmessages",allpresetvals)
            });

            prebuttons[i].addEventListener("click", function(e){
                console.log("pressed",this.id.slice(13,14),this.id);
                
                var messagearea = document.getElementById("message")
                messagearea.value="";
                var titlearea = document.getElementById("title")
                titlearea.value="";

                if(presetvals[this.id.slice(13,14)-1]["message"]){
                  // messagearea.value=presetvals[this.id.slice(13,14)-1]["message"];
                  //hack to make message area work

                  var ed = document.getElementsByClassName("editable")
                  ed[0].innerHTML = presetvals[this.id.slice(13,14)-1]["message"]
                }

                if(presetvals[this.id.slice(13,14)-1]["title"]){
                  titlearea.value=presetvals[this.id.slice(13,14)-1]["title"];
                }
            });
        };

        Loadprops();


        //display username and initials

        var closer = document.getElementsByClassName("ms-PanelAction-close")[0]
        closer.addEventListener("click",function(){
          Saveprop("presetmessages",allpresetvals)
        })

        var personname; 
        
        if(config.nickName.length>1){
          personname=config.nickName
        }else{
          personname=config.username
        }


        var dispusername = document.getElementById("username")
        var dispuserinitials = document.getElementById("userinitials")
        dispusername.innerText=personname;
        dispuserinitials.innerText= personname.charAt(0).toUpperCase()

        var PersonaElements = document.querySelectorAll(".ms-Persona");
        for (var i = 0; i < PersonaElements.length; i++) {
          new fabric['Persona'](PersonaElements[i]);
        }

    }


    function Loadprops(){


        TL_MessageBlast.Request.makerequest("GET","chat/users?search="+config.username, function(response){

              console.log("settings load",response.user.properties);

              var items = response.user.properties.property;

              for (var i = 0; i < items.length; i++) {
                
                if(items[i]["@key"]=="presetmessages"){
                    if(items[i]["@value"]!="" && items[i]["@value"].indexOf("[")==0){
                        presetvals = JSON.parse(items[i]["@value"]);
                       
                        for (var j = 0; j < presetvals.length; j++) {
                          document.getElementById("presettitle"+(j+1)).value=presetvals[j].title;
                          document.getElementById("presetmessage"+(j+1)).innerHTML=presetvals[j].message;
                          // document.getElementById("presetmessage"+(j+1)).previousSibling.innerHTML = presetvals[j].message;
                        };
                    }
                }

              };

              showhidepresetbuts()

        });
    }

    function Saveprop(prop,value){

        TL_MessageBlast.Request.makerequest("POST","chat/users/"+prop, function(response){

              console.log("settings save",response)
              showhidepresetbuts()

        },value);
    }


    function Clearprop(prop){

        TL_MessageBlast.Request.makerequest("DELETE","chat/users/"+prop, function(response){

              console.log("settings clear",response)
              showhidepresetbuts()

        } );
    }

    
    function showhidepresetbuts(){
      
        var prebuttons = document.getElementById("presetmessagebuttons").getElementsByTagName("button");
      
        for (var i = 0; i < prebuttons.length; i++) {
          
          if(presetvals[i].title.length>3 || presetvals[i].message.length>11){
              prebuttons[i].className="ms-Button ms-Button--small"
          }else{
              prebuttons[i].className="ms-Button ms-Button--small hidden"
          }
          
        };
    }



    return {
                    init:Init,
               loadprops:Loadprops,
                saveprop:Saveprop,
               clearprop:Clearprop
    };
  
} ( TL_MessageBlast.Settings || {} ));