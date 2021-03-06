import Ember from 'ember';
import User from 'console/models/user';

export default Ember.Route.extend({

  model: function(){
    var realm = this.modelFor('secure.realms');
    return voyent.io.admin.getRealmUsers({realmName: realm.get('id')}).then((users) => {
      if( users ){
        realm.users = users.map( u => User.create(u));
      }
      return realm;
    });
  }

});
