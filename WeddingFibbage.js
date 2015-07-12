// var Groups, Questions;
Groups = new Meteor.Collection("groups");
Questions = new Meteor.Collection("questions");
Players = new Meteor.Collection("players");
Messages = new Meteor.Collection("messages");
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
      if(Meteor.user() == null){2
        return "loginPrompt";
      }else{
        var _player = Players.findOne({userId: Meteor.userId()});
        
        if(_player.lastGroup != null && _player.lastGroupPassword != null){
          if(Groups.findOne({_id: _player.lastGroup, password: _player.lastGroupPassword})){
            return "gameRoom";
          }else{
            Meteor.call("sendMessageToPlayer", Meteor.userId(), "Invalid Room Password");
            Meteor.call("leaveGroup");
            return "groupList";
          }
        }else if (_player.lastGroup != null && _player.lastGroupPassword == null){
          return "joinRoom";
        }else{
          return "groupList";
        }
      }
    },
    message: function(){
      if(Messages.findOne({playerId: Meteor.userId()})){
        return "message"
      }
      return;
    }
  });
  
  Template.message.helpers({
    message : function(){
      return Messages.findOne({playerId : Meteor.userId()});
    },
    count : function(){
      return Messages.find({playerId: Meteor.userId()}).count();
    }
  });
  
  Template.message.events({
    "click button" : function(event){
      var _msgId = $(event.target).siblings("input[type='hidden']").val();
      Meteor.call("removeMessage", _msgId);
    }
  });

  Template.gameRoom.helpers({
    group: function(){
      var _groupId = Players.findOne({userId : Meteor.userId()}).lastGroup;
      return Groups.findOne(_groupId) ;
    },
    players : function(){
      var _groupId = Players.findOne({userId : Meteor.userId()}).lastGroup;
      var _group = Groups.findOne(_groupId);
      return Players.find({lastGroup: _group._id, lastGroupPassword: _group.password});
    },
    isOwner : function(){
      var _groupId = Players.findOne({userId : Meteor.userId()}).lastGroup;
      return Groups.findOne(_groupId).ownerId == Meteor.userId();
    }
  });
  Template.gameRoom.events({
    "click #leaveGroup" : function(event){
      Meteor.call('leaveGroup', Meteor.userId());
    },
    "click #disbandGroup" : function(event){
      var _groupId = $(event.target).data("groupid");
      console.log(_groupId);
      Meteor.call('disbandGroup', _groupId);
    }
  });
  
  Template.joinRoom.events({
    "click .cancel" : function (event){
      Meteor.call("leaveGroup");
    },
    "click .submit" : function (event) {
      
      var _groupId = Players.findOne({userId : Meteor.userId()}).lastGroup;
      Meteor.call("joinGroup", Meteor.userId(), _groupId, $(event.target).siblings('input').val().toUpperCase());
      return true;
    }
  });
  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
  Accounts.onLogin(function(){
    Meteor.call("setUserOnline", Meteor.userId());
  });
}

if (Meteor.isServer) {

  Meteor.methods({
    setUserOnline: function(userId){
      Players.upsert({userId: userId}, {$set: {username: Meteor.user().username, online: true, connectionId: this.connection.id}})
    },
    setUserOffline: function(conId){
      conId = conId || this.connection.id;
      Players.update({connectionId: conId}, {$set : {online: false, lastOnline: Date()}},{multi: true});
    },
    createGroup : function(name, ownerId){
        var _password = generatePassword();
        var _groupId = Groups.insert({name: name, ownerId: ownerId, password: _password, redPlayer: null, bluePlayer: null});
        Players.update({userId: ownerId}, {$set: {lastGroup: _groupId, lastGroupPassword: _password}});
    },
    joinGroup : function(_userId, _groupId, _password){
      _userId = _userId || Meteor.userId();
      Players.update({userId: _userId}, {$set: {lastGroup : _groupId, lastGroupPassword: _password}});
    },
    leaveGroup : function(_userId){
      _userId = _userId || Meteor.userId();
      Players.update({userId: _userId}, {$set: {lastGroup : null, lastGroupPassword: null}});
    },
    removeGroup : function(_groupId){
      Groups.remove(_groupId);
    },
    disbandGroup : function (_groupId){
      Players.find({lastGroup: _groupId}).forEach(function(player){ 
        Meteor.call("sendMessageToPlayer", player.userId, "Your group has been disbanded");
        Meteor.call("leaveGroup", player.userId);
        Meteor.call("removeGroup", _groupId);
      });
    },
    removeMessage : function (_msgId){
      Messages.remove(_msgId);
    },
    sendMessageToPlayer : function (_playerId, _text){
      Messages.insert({playerId: _playerId, text: _text});
      return;
    },
    test : function(){
    
      Groups.remove({});
      Messages.remove({});
      Players.remove({});
      
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