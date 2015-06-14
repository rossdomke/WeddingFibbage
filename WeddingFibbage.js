// var Groups, Questions;
Groups = new Meteor.Collection("groups");
Questions = new Meteor.Collection("questions");
Players = new Meteor.Collection("players");
TestCol = new Meteor.Collection("testcol");
if (Meteor.isClient) {

  Template.groupList.helpers({
      groups: function(){
        return Groups.find({});
      },
      onlineUsers: function(){
        return Players.find({online: true}).count();
      }
  });
  Template.groupList.events({
    "submit" : function(){
      var groupName = $('#groupName').val();
      Meteor.call("createGroup",groupName, Meteor.userId());
      $('#groupName').val('');
      return false;
    }
  });
  Template.group.events({
    "click button" : function(event){
      var _groupId = $(event.target).data('roomid');
      Meteor.call('joinGroup', Meteor.userId(), _groupId);
    }
  });
  Template.body.helpers({
    state: function() {
      if(Meteor.user() == null){
        return "loginPrompt";
      }else{
        var _lastGroup = Players.findOne({userId: Meteor.userId()}).lastGroup;
        if(_lastGroup != null){
          if(Groups.findOne(_lastGroup).isActive){
            return "gameRoom";
          }else{
            alert("room inactive - The owner has closed the group - returning to group list");
            Meteor.call("leaveGroup", Meteor.userId());
            return "groupList";
          }
        }else{
          return "groupList";
        }
      }
    }
  });

  Template.gameRoom.helpers({
    groupId : function(){
      return Players.findOne({userId : Meteor.userId()}).lastGroup;
    },
    groupName: function() {
      var _groupId = Players.findOne({userId : Meteor.userId()}).lastGroup;
      return Groups.findOne(_groupId).name;
    },
    players : function(){
      var _groupId = Players.findOne({userId : Meteor.userId()}).lastGroup;
      return Players.find({lastGroup: _groupId});
    }
  });
  Template.gameRoom.events({
    "click #leaveGroup" : function(event){
      Meteor.call('leaveGroup', Meteor.userId());
    }
  });
  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
  Accounts.onLogin(function(){
    Meteor.call("setUserOnline", Meteor.userId());
  });
  // Accounts.onLogout(function(){
  //   Meteor.call("setUserOnline", false);
  //   console.log('logoff - offline');
  // })
}

if (Meteor.isServer) {

  Meteor.methods({
    setUserOnline: function(userId){
      Players.upsert({userId: userId}, {$set: {username: Meteor.user().username, online: true, connectionId: this.connection.id}})
    },
    setUserOffline: function(conId){
      conId = conId || this.connection.id;
      Players.update({connectionId: conId}, {$set : {online: false}},{multi: true});
    },
    createGroup : function(name, ownerId){
        var groupId = Groups.insert({name: name, ownerId: ownerId, password:generatePassword(), redPlayer: null, bluePlayer: null, isActive: true});
        Players.update({userId: ownerId}, {$set: {lastGroup: groupId}});
    },
    joinGroup : function(_userId, _groupId){
      _userId = _userId || Meteor.userId();
      Players.update({userId: _userId}, {$set: {lastGroup : _groupId}});
    },
    leaveGroup : function(_userId){
      _userId = _userId || Meteor.userId();
      Players.update({userId: _userId}, {$set: {lastGroup : null}});
    },
    test : function(){
    
      Groups.remove({});
    }
  });
  Meteor.startup(function () {
    // code to run on server at startup
    // if(Meteor.userID() != null){
    //   Players.insert({Meteor.user.})
    // }
  });
  Meteor.onConnection(function(connection) {
    return connection.onClose(function() {
      return Meteor.call("setUserOffline", connection.id);
    });
  });
}

generatePassword = function(){
  var possibleChar = "ABCDEFGHJKMNOPQRSTUVWXYZ";
  var returnPassword = "";
  for(var i = 0; i < 4; i++){
    returnPassword += possibleChar.charAt(Math.random() * possibleChar.length);
  }
  return returnPassword;
}