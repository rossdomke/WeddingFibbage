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
      return Players.find({lastGroup: _group._id, lastGroupPassword: _group.password}, {sort : {username: -1}});
    },
    isOwner : function(){
      var _groupId = Players.findOne({userId : Meteor.userId()}).lastGroup;
      return Groups.findOne(_groupId).ownerId == Meteor.userId();
    },
    yourTeam : function(){
      switch (Players.findOne({userId : Meteor.userId()}).team){
        case "r":
          return "Red";
        case "b":
          return "Blue";
        case "s":
          return "Spectator";
        default: 
          return "Spectator";
      }
    },
    adminControls : function(){
      var group = Groups.findOne(Players.findOne({userId : Meteor.userId()}).lastGroup);
      if(group.redPlayer == null || group.bluePlayer == null){
        return;
      }else if(group.pendingQs.length == 0 && group.activeQ == null){
        return "startGame";
      }else if(group.activeQ == null && group.finishedQs.lenght != 0){
        return "tallyScore";
      }else{
        return "nextQuestion";
      }
    },
    game : function (){
      var group = Groups.findOne(Players.findOne({userId : Meteor.userId()}).lastGroup);
      if(group.activeQ != null){
        return "question";
      }else{
        return "pickTeam";
      }
    }
  });
  Template.gameRoom.events({
    "click #leaveGroup" : function(event){
      Meteor.call('leaveGroup', Meteor.userId());
    },
    "click #disbandGroup" : function(event){
      var _groupId = $(event.target).data("groupid");
      Meteor.call('disbandGroup', _groupId);
    }
  });
  Template.startGame.events({
    "click button" : function(event){
      var _groupId = Players.findOne({userId : Meteor.userId()}).lastGroup;
      Meteor.call("populateQuestions", _groupId);
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
  
  
  Template.player.helpers({
    isOwner : function(_playerId){
      if(_playerId == Meteor.userId()){
        return false;
      }
      var _groupId = Players.findOne({userId : Meteor.userId()}).lastGroup;
      return Groups.findOne(_groupId).ownerId == Meteor.userId();
    },
    isRedPlayer : function(_playerId, _groupId){
      return Groups.findOne(_groupId).redPlayer == _playerId;
    },
    isBluePlayer : function(_playerId, _groupId){
      return Groups.findOne(_groupId).bluePlayer == _playerId;
    }
  });
  Template.player.events({
    "click button.kick" : function(event){
      var _playerId = $(event.target).data('userid');
      Meteor.call("assignPlayer", _playerId, "del");
      Meteor.call("sendMessageToPlayer", _playerId, "You have been kicked from the room");
      Meteor.call("leaveGroup", _playerId);
    },
    "click button.red" : function(event){
      var _playerId = $(event.target).data('userid');
      Meteor.call("assignPlayer", _playerId, "r");
    },
    "click button.blue" : function(event){
      var _playerId = $(event.target).data('userid');
      Meteor.call("assignPlayer", _playerId, "b");
    }
  });
  
  Template.pickTeam.events({
    "click .team" : function(event){
      var _team = $(event.target).data('team');
      Meteor.call("changeTeam", Meteor.userId(), _team);
    }
  });
  
  Template.question.helpers({
    question : function(){
      var group = Groups.findOne(Players.findOne({userId : Meteor.userId()}).lastGroup);
      return group.activeQ;
    },
    isTeamLeader : function(){
      var group = Groups.findOne(Players.findOne({userId : Meteor.userId()}).lastGroup);
      return (group.redPlayer == Meteor.userId() || group.bluePlayer == Meteor.userId()); 
    }, 
    teamLeaderHasAnswered : function(){
      var player = Players.findOne({userId : Meteor.userId()});
      var group = Groups.findOne(player.lastGroup);
      if(player.team == 'b' && group.activeQ.blueAnswer != null){
        return true;
      }else if(player.team == 'r' && group.activeQ.redAnswer != null){
        return true;
      }else{
        return false;
      }
    },
    userHasAnswered : function(){
      return Players.findOne({userId : Meteor.userId()}).hasAnswered || false;
    },
    leaderAnswer : function(){
      var player = Players.findOne({userId : Meteor.userId()});
      var group = Groups.findOne(player.lastGroup);
      if(player.team == 'b'){
        return group.activeQ.blueAnswer;
      }else if(player.team == 'r'){
        return group.activeQ.redAnswer;
      }else{
        return "You're not on a team";
      }
    },
    everyoneHasAnswered : function(){
      var player = Players.findOne({userId : Meteor.userId()});
      return Players.find({lastGroup: player.lastGroup, hasAnswered : false}).count() == 0;
    }
  });
  
  Template.question.events({
    "click .submitAnswer" : function(event){
      var answer = $('input[name="answerInput"]').val();
      var player = Players.findOne({userId: Meteor.userId()});
      console.log(answer);
      console.log(player);
      Meteor.call("answerQuestion", player.lastGroup, player.userId, answer);
    }
  });
  
  Template.nextQuestion.helpers({
    everyoneHasAnswered : function(){
      var player = Players.findOne({userId : Meteor.userId()});
      return Players.find({lastGroup: player.lastGroup, hasAnswered : false}).count() == 0;
    }
  });
  Template.nextQuestion.events({
    "click #NextQuestion" : function(){
      Meteor.call("nextQuestion", Players.findOne({userId : Meteor.userId()}).lastGroup );
    },
    "click #AdvanceToPicking" : function(){
      Meteor.call("advanceToPicking", Players.findOne({userId : Meteor.userId()}).lastGroup );
    }
    
  });
  Template.pickAnswer.helpers({
    isTeamLeader : function(){
      var group = Groups.findOne(Players.findOne({userId : Meteor.userId()}).lastGroup);
      return (group.redPlayer == Meteor.userId() || group.bluePlayer == Meteor.userId()); 
    },
    getAnswers : function(myTeam){
      var randomAnswers = [];
      var Player = Players.findOne({userId : Meteor.userId()});
      var group = Groups.findOne(Player.lastGroup); 
      var q = group.activeQ;
      var currAns = [];
      var team = (myTeam) ? Player.team : ((Player.team == "r") ? "b" : "r");
      if(team == 'b'){
        currAns = q.blueTeamAnswers;
        currAns.push({playerId : group.bluePlayer, answer : q.blueAnswer});
      }else{
        currAns = q.redTeamAnswers;
        currAns.push({ playerId : group.redPlayer, answer : q.redAnswer})
      }
      while(currAns.length != 0){
        var randomNum = Math.floor(Math.random() * (currAns.length - 1));
        randomAnswers.push(currAns[randomNum]);
        currAns.splice(randomNum, 1);
      }
      return randomAnswers;
    },
    notAnswered : function(){
      var Player = Players.findOne({userId : Meteor.userId()});
      var q = Groups.findOne(Player.lastGroup).activeQ;
      if(Player.team == 'r'){
        return q.redChosen == null;
      }else{
        return q.blueChosen == null;
      }
    }
  });
  Template.answer.helpers({
    chosen : function(playerId){
      var q = Groups.findOne(Players.findOne({userId : Meteor.userId()}).lastGroup).activeQ;
      if (q.redChosen == playerId || q.blueChosen == playerId)
        return "chosen"
        
    },
    correct : function(playerId){
      var group = Groups.findOne(Players.findOne({userId : Meteor.userId()}).lastGroup);
      if(playerId == group.redPlayer || playerId == group.bluePlayer){
        return "correct";
      }
      return;
    }
  });
  Template.activeAnswer.events({
    "click button" : function(event){
      var playerId = $(event.target).data('playerid');
      var Player = Players.findOne({userId : Meteor.userId()});
      Meteor.call("chooseAnswer", Player, playerId);
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
        var _groupId = Groups.insert({name: name, ownerId: ownerId, password: _password, redPlayer: null, bluePlayer: null, pendingQs : [], finishedQs : []});
        Players.update({userId: ownerId}, {$set: {lastGroup: _groupId, lastGroupPassword: _password}});
    },
    joinGroup : function(_userId, _groupId, _password){
      _userId = _userId || Meteor.userId();
      Players.update({userId: _userId}, {$set: {lastGroup : _groupId, lastGroupPassword: _password, team: 's'}});
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
    changeTeam : function (_userId, _team){
      Players.update({userId: _userId}, {$set: {team: _team}});
    },
    assignPlayer : function(_playerId, _team){
      Meteor.call("changeTeam", _playerId, _team);
      Groups.update({redPlayer : _playerId}, {$set: {redPlayer : null}});
      Groups.update({bluePlayer : _playerId}, {$set: {bluePlayer : null}});
      var _groupId = Players.findOne({userId: _playerId}).lastGroup;
      if(_team == 'b'){
        Groups.update({_id: _groupId}, {$set: {bluePlayer : _playerId}});
      }else if(_team == 'r'){
        Groups.update({_id: _groupId}, {$set: {redPlayer : _playerId}});
      }
    },
    populateQuestions : function(_groupId){
      var Qs = [
        {text: "Question1?", redTeamAnswers: [], blueTeamAnswers: []},
        {text: "Question2?"},
        {text: "Question3?"},
        {text: "Question4?"},
        {text: "Question5?"},
      ]
      Groups.update(_groupId, {$set: {pendingQs : Qs, finishedQs : []}});
      Meteor.call("nextQuestion", _groupId);
    },
    nextQuestion : function(_groupId){
      var group = Groups.findOne(_groupId);
      if(group.activeQ != null)
        group.finishedQs.push(group.activeQ);
      group.activeQ = group.pendingQs.pop();
      Groups.update({_id : _groupId}, {$set : {finishedQs : group.finishedQs, activeQ : group.activeQ,pendingQs: group.pendingQs}});
      Players.update({lastGroup : _groupId}, {$set : {hasAnswered : false}}, {multi: true});
     
    },
    answerQuestion : function(_groupId, _playerId, _answer ){
      var _group = Groups.findOne(_groupId);
      if(_group.redPlayer == _playerId){
        _group.activeQ.redAnswer = _answer;
        _group.activeQ.redTeamAnswers = [];
      }else if(_group.bluePlayer == _playerId){
        _group.activeQ.blueAnswer = _answer;
        _group.activeQ.blueTeamAnswers = [];
      }else{
        var _player = Players.findOne({userId: _playerId}); 
        if(_player.team == 'r'){
          _group.activeQ.redTeamAnswers.push({playerId : _playerId, answer: _answer});
        }else if(_player.team == 'b'){
          _group.activeQ.blueTeamAnswers.push({playerId : _playerId, answer: _answer});
        }else{
          console.error("spectators cannot answer questions");
        }
        
      }
      Players.update({userId : _playerId}, {$set : {hasAnswered : true}});
      Groups.update(_groupId, {$set : { activeQ : _group.activeQ}})
      
    },
    advanceToPicking : function(_groupId){
      Players.update({lastGroup : _groupId}, {$set : {hasAnswered : true}}, {multi: true});
    },
    chooseAnswer : function(_Player, chosenId){
      var _group = Groups.findOne(_Player.lastGroup);
      if(_Player.team == 'r'){
        _group.activeQ.redChosen = chosenId;
      }else{
        _group.activeQ.blueChosen = chosenId;
      }
      Groups.update(_Player.lastGroup, {$set : {activeQ : _group.activeQ}});
    },
    
    test : function(){
    
      Groups.remove({});
      Messages.remove({});
      Players.remove({});
    },
    groupReset : function(){
      Groups.update({}, {$set : {pendingQs : [], activeQ : null, finishedQs : []}})
    }
  });
  Meteor.startup(function () {
    // code to run on server at startup
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