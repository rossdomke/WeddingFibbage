// var Groups, Questions;
Groups = new Meteor.Collection("groups");
Questions = new Meteor.Collection("questions");
Players = new Meteor.Collection("players");

if (Meteor.isClient) {

  Template.groupList.helpers({
      groups: function(){
        return Groups.find({});
      },
      onlineUsers: function(){
        return Players.find({online: true}).count();
      }
  });
  Template.body.helpers({
    state: function() {
      if(Meteor.user() == null){
        return "loginPrompt";
      }else{
        return "groupList";
      }
      // var group, identity;
      // identity = Identity.findOne({});
      // group = Groups.findOne({});
      // if ((identity != null ? identity.role : void 0) != null) {
      //   return "identity";
      // } else if (group != null) {
      //   return "players";
      // } else {
      //   return "login";
      // }
    }
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
  Accounts.onLogin(function(){
    Meteor.call("setUserOnline", true);
    console.log('login - online');
  });
  Accounts.onLogout(function(){
    Meteor.call("setUserOnline", false);
    console.log('logoff - offline');
  })
}

if (Meteor.isServer) {

  Meteor.methods({
    setUserOnline: function(isOnline){
      Players.upsert({userId: Meteor.userId()}, {$set: {username: Meteor.user().username, online: isOnline}})
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
        Meteor.call("setUserOnline", false);
    });
  });
}