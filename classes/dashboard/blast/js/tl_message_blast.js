
    // var ListElements = document.querySelectorAll(".ms-List");
    //   for (var i = 0; i < ListElements.length; i++) {
    //     new fabric['List'](ListElements[i]);
    //   }

    var SearchBoxElements = document.querySelectorAll(".ms-SearchBox");
          for (var i = 0; i < SearchBoxElements.length; i++) {
            new fabric['SearchBox'](SearchBoxElements[i]);
    }

    var allCheckBoxElements = document.querySelectorAll(".ms-CheckBox");
      for (var i = 0; i < allCheckBoxElements.length; i++) {
        allCheckBoxElements[i].allfabriccheckboxes = new fabric['CheckBox'](allCheckBoxElements[i]);
      }

    var DatePickerElements = document.querySelectorAll(".ms-DatePicker");
          for (var i = 0; i < DatePickerElements.length; i++) {
            new fabric['DatePicker'](DatePickerElements[i]);
          }

    // var TableElements = document.querySelectorAll(".ms-Table");
    // for (var i = 0; i < TableElements.length; i++) {
    // new fabric['Table'](TableElements[i]);
    // }


    var PivotElements = document.querySelectorAll(".ms-Pivot");
    for (var i = 0; i < PivotElements.length; i++) {
         var pivi = new fabric['Pivot'](PivotElements[i]);
         this.onclick=function(e){

          if(e.target.className=="ms-Pivot-link is-selected"){
              if(e.target.innerHTML.indexOf("New Blast")!=-1){
                  TL_MessageBlast.Newblast.resetfields();
              }
              if(e.target.innerHTML.indexOf("Pending Blasts")!=-1){
                  TL_MessageBlast.Pending.refreshsent()
              }
              if(e.target.innerHTML.indexOf("Sent Blasts")!=-1){
                  TL_MessageBlast.Sent.refreshsent()
              }
          }

         }
    }




    var PanelExamples = document.getElementsByClassName("ms-PanelExample");
    for (var i = 0; i < PanelExamples.length; i++) {
      (function() {
        var PanelExampleButton = document.getElementById("settingsbutton");
        var PanelExamplePanel = PanelExamples[i].querySelector(".ms-Panel");
        PanelExampleButton.addEventListener("click", function(i) {
          new fabric['Panel'](PanelExamplePanel);
        });
      }());
    }





    function isEmpty(obj) {
        for(var prop in obj) {
            if(obj.hasOwnProperty(prop))
                return false;
        }

        return JSON.stringify(obj) === JSON.stringify({});
    }

    function formatdate(datetoformat){
        var date = new Date(datetoformat);
        var localtime = date.toLocaleString('en-GB');
        return localtime;
    }

    function timeelapsed(time){

        var dd = new Date(time);
        var d = new Date();

        var second = 60*60000,
            minute = 60 * 1000,
            hour = minute * 60,
            day = hour * 24,
            month = day * 30,
            ms = Math.abs(d - dd);

        var months = parseInt(ms / month, 10);

            ms -= months * month;

        var days = parseInt(ms / day, 10);

            ms -= days * day;

        var hours = parseInt(ms / hour, 10);

            ms -= hours * hour;


        var minutes = parseInt(ms / minute, 10);

        var seconds = parseInt((ms / minute)*60, 10);


        if(minutes==0){
          return seconds+" seconds ago";
        }
        else if(hours==0){
          if(minutes==1){
            return minutes+" minute ago"
          }
          return minutes+" minutes ago"
        }
        else if(days==0){
          if(hours==1){
            return hours+" hour ago"
          }
          return hours+" hours ago"
        }else if(months==0){
          if(days==1){
            return days+" day ago"
          }
          return days+" days ago"
        }else{
          return [
            months + " months",
            days + " days",
            hours + " hours"
            ].join(", ");
        }


        // return [
        //     months + " months",
        //     days + " days",
        //     hours + " hours",
        //     minutes + " minutes"
        // ].join(", ");

    }


    window.onload = function() {

        TL_MessageBlast.Request.init();
        TL_MessageBlast.Settings.init();
        TL_MessageBlast.Inbox.init();
        TL_MessageBlast.Newblast.init();
        TL_MessageBlast.Sent.init();
        TL_MessageBlast.Pending.init();
        TL_MessageBlast.Fileuploader.init();
        TL_MessageBlast.Attachment.init();
        resizethescroller();


    }

    window.addEventListener('resize',function(){
        resizethescroller()
    },false);


    function resizethescroller(){

      var scroller = document.getElementsByClassName('scroller')
      for (var i = 0; i < scroller.length; i++) {
        scroller[i].style.height=(window.innerHeight-100)+"px";
      };

      var scroller = document.getElementsByClassName('halfwidthscroller')
      for (var i = 0; i < scroller.length; i++) {
        scroller[i].style.height=(window.innerHeight-70)+"px";
      };

      var halfscroller = document.getElementsByClassName('halfscroller')
      for (var i = 0; i < halfscroller.length; i++) {
        halfscroller[i].style.height=((window.innerHeight/2)-100)+"px";
      };

       var halfscrollerbot = document.getElementsByClassName('halfscrollerbot')
      for (var i = 0; i < halfscrollerbot.length; i++) {
        halfscrollerbot[i].style.height=(window.innerHeight/2)+"px";
      };
      window.scrollTo(0, 0);
    }
