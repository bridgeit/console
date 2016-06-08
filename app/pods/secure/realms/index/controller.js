import Ember from 'ember';
import BaseController from 'console/controllers/base-controller';
import RealmMixin from 'console/controllers/realm-mixin';

//import Ember from 'ember';

export default BaseController.extend( RealmMixin, {

	//TODO show custom json object as property list

	showCloneRealmPopup: false,
	cloneRealmMsg: null,
	application: Ember.inject.controller(),
	cloneRealmLog: null,
	cloneRealmInProcess: false,
	isCreatingNewResource: false,
	
	openConfirmDeleteRealmPopup: function() {
		Ember.$('#deleteRealmModal').modal();
	},

	closeDeleteRealmPopup: function() {
		Ember.$('#deleteRealmModal').modal('hide');
	},

	accountUsernames: function(){
		//gather all usernames from account admins and realm users
		let usernames = this.get('application.account.adminUsernames');
		let realmUsers = this.get('model.users');
		if( realmUsers ){
			usernames = usernames.concat(realmUsers.map((u) => u.get('username')));
		}
		return usernames;
	}.property('application.account.admins.[]', 'model.users.[]'),

	validateResource: function(resource, id, service, path){
		//this is undefined as function is called by component
		if( service === 'action'){
			if( !id ){
				window.alert('Please enter the required id for the action.');
				return false;
			}
		}
		else if( service === 'documents'){

		}
		else if( service === 'query'){

		}
		else if( service === 'mailbox'){

		}
		else if( service === 'location'){
			if( path === 'poi'){

			}
			else if( path === 'regions'){

			}
		}
		return true;
	},

	actions: {
		
		openCloneRealmPopup: function() {
			this.set('showCloneRealmPopup', true);
			Ember.$('#cloneRealmModal').modal();
			setTimeout(() => {
				Ember.$('#newCloneRealmName').focus();
			},200);
		},

		closeCloneRealmPopup: function(){
			this.set('showCloneRealmPopup', false);
			Ember.$('#cloneRealmModal').modal("hide");
		},

		cloneRealmDialog: function(){
			this.send('openCloneRealmPopup');
		},

		cancelCloneRealm: function(){
			this.set('selectedRealm', null);
			this.send('closeCloneRealmPopup');
		},

		confirmDeleteRealm: function(){
			this.openConfirmDeleteRealmPopup();
		},

		cancelDeleteRealm: function(){
			this.closeDeleteRealmPopup();
		},

		deleteRealmConfirmed: function(){
			this.closeDeleteRealmPopup();

			var realm = this.get('model');
			var account = this.get('application.account');

			return bridgeit.io.admin.deleteRealm({realmName: realm.get('id')}).then(() => {
				
				//set the account on the realm so it has access to parent properties
				realm.set('account', account);

				//remove deleted realm from account.realms
				var realms = account.get('realms').filter((r) => r.get('id') !== realm.get('id'));
				account.set('realms', realms); 
				this.transitionToRoute('secure.index');
			});
		},

		cloneRealm: function(){

			var log = function log(msg){
				_log = msg + "\n" + _log;
				self.set('cloneRealmLog', _log);
			};

			var _log = '';
			var self = this;
			this.set('cloneRealmInProcess', true);
			var newRealmName = this.get('newCloneRealmName');
			var realm = this.get('model');
			var oldRealmName = realm.get('id');
			log("Starting clone realm process");

			
			//admin.cloneRealm() will only clone basic info
			return bridgeit.io.admin.cloneRealm({originRealmName: realm.get('id'), destRealmName: newRealmName}).then((clonedRealmURI) => {
				log('created newly cloned realm with basic info: ' + clonedRealmURI);

				//clone all POIs
				log('fetching location service POIs');
				return bridgeit.io.location.getAllPOIs({realm: oldRealmName}).catch((err) => {
					log('ERROR fetching POIs: ' + err.responseText);
				});

			}).then((pois) => {

				var poiPromises = [];
				if( pois ){
					log('cloning ' + pois.length + ' POIs');
					pois.forEach((poi) => {
						poiPromises.push(Ember.RSVP.Promise.resolve().then(() => {
							return bridgeit.io.location.createPOI({
								realm: newRealmName,
								poi: poi
							}).catch((err) => {
								log('ERROR: ' + err.responseText);
							});
						}));
					});
				}
				return Ember.RSVP.Promise.all(poiPromises);

			}).then(() => {
				log('completed cloning POIs');

				//clone all regions
				log('fetching location service regions');
				return bridgeit.io.location.findRegions({realm: oldRealmName}).catch((err) => {
					log('ERROR fetching regions: ' + err.responseText);
				});

			}).then((regions) => {

				var regionPromises = [];
				if( regions ){
					log('cloning ' + regions.length + ' regions');
					regions.forEach((region) => {
						regionPromises.push(Ember.RSVP.Promise.resolve().then(() => {
							return bridgeit.io.location.createRegion({
								realm: newRealmName,
								region: region
							}).catch((err) => {
								log('ERROR: ' + err.responseText);
							});
						}));
					});
				}
				return Ember.RSVP.Promise.all(regionPromises);

			}).then(() => {
				log('completed cloning regions');

				//actions
				log('fetching action service actions');
				return bridgeit.io.action.findActions({realm: oldRealmName}).catch((err) => {
					log('ERROR fetching actions: ' + err.responseText);
				});

			}).then((actions) => {

				var actionPromises = [];
				if( actions ){
					log('cloning ' + actions.length + ' actions');
					actions.forEach((action) => {
						actionPromises.push(Ember.RSVP.Promise.resolve().then(() => {
							return bridgeit.io.action.createAction({
								realm: newRealmName,
								id: action._id,
								action: action
							}).catch((err) => {
								log('ERROR: ' + err.responseText);
							});
						}));
					});
				}
				return Ember.RSVP.Promise.all(actionPromises);

			}).then(() => {
				log('completed cloning actions');

				//docs, will only fetch documents in the main collection
				//TODO awaiting http://jira.icesoft.org/browse/NTFY-388
				log('fetching document service documents');
				return bridgeit.io.documents.findDocuments({realm: oldRealmName}).catch((err) => {
					log('ERROR fetching documents: ' + err.responseText);
				});

			}).then((documents) => {

				var docPromises = [];
				if( documents ){
					log('cloning ' + documents.length + ' documents');
					documents.forEach((doc) => {
						docPromises.push(Ember.RSVP.Promise.resolve().then(() => {
							return bridgeit.io.documents.createDocument({
								realm: newRealmName,
								document: doc
							}).catch((err) => {
								log('ERROR: ' + err.responseText);
							});
						}));
					});
				}
				return Ember.RSVP.Promise.all(docPromises);

			}).then(() => {
				log('completed cloning documents');

				//eventhub handlers
				log('fetching eventhub handlers');
				return bridgeit.io.eventhub.findHandlers({realm: oldRealmName}).catch((err) => {
					log('ERROR fetching handlers: ' + err.responseText);
				});

			}).then((handlers) => {

				var handlerPromises = [];
				if( handlers ){
					log('cloning ' + handlers.length + ' handlers');
					handlers.forEach((handler) => {
						handlerPromises.push(Ember.RSVP.Promise.resolve().then(() => {
							return bridgeit.io.eventhub.createHandler({
								realm: newRealmName,
								id: handler._id,
								handler: handler
							}).catch((err) => {
								log('ERROR: ' + err.responseText);
							});
						}));
					});
				}
				return Ember.RSVP.Promise.all(handlerPromises);

			}).then(() => {
				log('completed cloning handlers');

				//eventhub recognizers
				log('fetching eventhub recognizers');
				return bridgeit.io.eventhub.findRecognizers({realm: oldRealmName}).catch((err) => {
					log('ERROR fetching recognizers: ' + err.responseText);
				});

			}).then((recognizers) => {

				var recognizerPromises = [];
				if( recognizers ){
					log('cloning ' + recognizers.length + ' recognizers');
					recognizers.forEach((recognizer) => {
						recognizerPromises.push(Ember.RSVP.Promise.resolve().then(() => {
							bridgeit.io.eventhub.createRecognizer({
								realm: newRealmName,
								id: recognizer._id,
								recognizer: recognizer
							}).catch((err) => {
								log('ERROR: ' + err.responseText);
							});
						}));
					});
				}
				return Ember.RSVP.Promise.all(recognizerPromises);

			}).then(() => {
				log('completed cloning recognizers');

				//eventhub queries
				log('fetching query service queries');
				return bridgeit.io.query.findQueries({realm: oldRealmName}).catch((err) => {
					log('ERROR fetching queries: ' + err.responseText);
				});

			}).then((queries) => {

				var queryPromises = [];
				if( queries ){
					log('cloning ' + queries.length + ' queries');
					queries.forEach((query) => {
						queryPromises.push(Ember.RSVP.Promise.resolve().then(() => {
							bridgeit.io.query.createQuery({
								realm: newRealmName,
								query: query
							}).catch((err) => {
								log('ERROR: ' + err.responseText);
							});
						}));
					});
				}
				return Ember.RSVP.Promise.all(queryPromises);

			}).then(() => {
				log('completed cloning queries');

				//mailboxes
				log('fetching mailboxes');
				return bridgeit.io.mailbox.findMailboxes({realm: oldRealmName}).catch((err) => {
					log('ERROR fetching mailboxes: ' + err.responseText);
				});

			}).then((mailboxes) => {

				var mailboxPromises = [];
				if( mailboxes ){
					log('cloning ' + mailboxes.length + ' mailboxes');
					mailboxes.forEach((mailbox) => {
						mailboxPromises.push(Ember.RSVP.Promise.resolve().then(() => {
							bridgeit.io.mailbox.createMailbox({
								realm: newRealmName,
								id: mailbox._id,
								mailbox: mailbox
							}).catch((err) => {
								log('ERROR: ' + err.responseText);
							});
						}));
					});
				}
				return Ember.RSVP.Promise.all(mailboxPromises);

			}).then(() => {
				log('completed cloning mailboxes');

				log('fetching new realm: ' + newRealmName);

				return bridgeit.io.admin.getRealm({realm: newRealmName});

			}).then((clonedRealm) => {

				//after the newly cloned realm has been created we need to refetch it
				//and push it into the app state
				var account = this.get('application.account');
				realm.set('account', account);
				account.get('realms').pushObject(clonedRealm);
				this.set('cloneRealmInProcess', false);
				log('clone realm process completed');
				//this.transitionToRoute('secure.realms.index', clonedRealm);

			}).catch((err) => {
				this.set('cloneRealmInProcess', false);
				this.error('could not clone realm');
      			this.get('application').showErrorMessage(err, 'Could not complete realm cloning.');
			});

		},

		showResource: function(resource, service, path){
			this.set('selectedResource', resource);
			this.set('serviceForResource', service);
			this.set('showResourcePopup', true);
			this.set('selectedResourcePath', path);
		},

		onResourceSaved: function(resource, id){
			if( resource ){
				let service = this.get('serviceForResource');
				let realm = this.get('model');
				let path = this.get('selectedResourcePath');
				let originalResource = this.get('selectedResource');


				return Ember.RSVP.Promise.resolve().then(() => {
					//update existing resource
					if( originalResource._id ){ 

						resource._id = originalResource._id; //ensure id remains constant
						
						if( service === 'documents'){
							return bridgeit.io.documents.updateDocument({id: originalResource._id, document: resource}).then(() => {
								realm.set('documents', realm.get('documents').map((d) => d._id === resource._id ? resource : d));
							});
						}
						else if( service === 'action'){
							return bridgeit.io.action.updateAction({id: originalResource._id, action: resource}).then(() => {
								realm.set('actions', realm.get('actions').map((d) => d._id === resource._id ? resource : d));
							});
						}
						else if( service === 'eventhub'){
							if( path === 'handlers'){
								bridgeit.io.eventhub.updateHandler({id: originalResource._id, handler: resource}).then(() => {
									realm.set('handlers', realm.get('handlers').map((d) => d._id === resource._id ? resource : d));
								});
							}
							else if( path === 'recognizers'){
								bridgeit.io.eventhub.updateRecognizer({id: originalResource._id, recognizer: resource}).then(() => {
									realm.set('recognizers', realm.get('recognizers').map((d) => d._id === resource._id ? resource : d));
								});
							}
						}
						else if( service === 'location'){
							if( path === 'regions'){
								bridgeit.io.location.updateRegion({id: originalResource._id, region: resource}).then(() => {
									realm.set('regions', realm.get('regions').map((d) => d._id === resource._id ? resource : d));
								});
							}
							else if( path === 'poi'){
								bridgeit.io.location.updatePOI({id: originalResource._id, poi: resource}).then(() => {
									realm.set('pois', realm.get('pois').map((d) => d._id === resource._id ? resource : d));
								});
							}
						}
						
					}
					//create new resource
					else{ 

						if( id ){
							resource._id = id;
						}

						return Ember.RSVP.Promise.resolve().then(() => {
							if( service === 'documents'){
								return bridgeit.io.documents.createDocument({document: resource}).then((uri) => {
									realm.get('documents').pushObject(resource);
									return uri;
								});
							}
							else if( service === 'action'){
								return bridgeit.io.action.createAction({id: id, action: resource}).then((uri) => {
									realm.get('actions').pushObject(resource);
									return uri;
								});
							}
							else if( service === 'eventhub'){
								if( path === 'handlers'){
									return bridgeit.io.eventhub.createHandler({id: id, handler: resource}).then((uri) => {
										realm.get('handlers').pushObject(resource);
										return uri;
									});
								}
								else if( path === 'recognizers'){
									return bridgeit.io.eventhub.createRecognizer({id: id, recognizer: resource}).then((uri) => {
										realm.get('recognizers').pushObject(resource);
										return uri;
									});
								}
							}
							else if( service === 'location'){
								if( path === 'regions'){
									return bridgeit.io.location.createRegion({id: id, region: resource}).then((uri) => {
										realm.get('regions').pushObject(resource);
										return uri;
									});
								}
								else if( path === 'poi'){
									return bridgeit.io.location.createPOI({id: id, poi: resource}).then((uri) => {
										realm.get('pois').pushObject(resource);
										return uri;
									});
								}
							}
						}).then((uri) => {							
							//set new id on the resource if the user hasn't
							if( !id){
								let uriParts = uri.split('/');
								let newId = uriParts[uriParts.length-1];
								resource._id = newId;
							}
						});
					}
				}).then(() => {
					this.get('toast').info(path + ' resource saved');
					this.set('editingResource', false); //reset
				}).catch((error) => {
					this.get('application').showErrorMessage(error, path + ' resource could not be saved');
				});
			}
			
		},

		onResourceClosed: function(){
			this.set('selectedResource', null);
			this.set('showResourcePopup', false);
			this.set('selectedResourcePath', null);
			this.set('serviceForResource', null);
			this.set('isCreatingNewResource', false);
		},

		editResource: function(resource, service, path){
			this.set('editingResource', true);
			this.set('showResourcePopup', true);
			this.set('selectedResource', resource);
			this.set('serviceForResource', service);
			this.set('selectedResourcePath', path);
			this.set('isCreatingNewResource', false);
		},

		deleteResource: function(resource, service, path){
			let resourceType;
			if( service === 'documents' ){
				resourceType = 'document';
			}
			else if( service === 'action'){
				resourceType = 'action';
			}

			this.set('confirmDeleteResourceText', 'Are you sure you want to delete the ' + resourceType + ' ' + resource._id + '?');
			this.set('resourceToDelete', resource);
			this.set('serviceForResource', service);
			this.set('selectedResourcePath', path);
		},

		onConfirmDeleteResource: function(){
			let resource = this.get('resourceToDelete');
			let service = this.get('serviceForResource');
			let path = this.get('selectedResourcePath');
			if( resource ){
				if( service === 'documents'){
					bridgeit.io.documents.deleteDocument({id: resource._id}).then(() => {
						//remove doc from realm
						let realm = this.get('model');
						realm.set('documents', realm.get('documents').filter((d) => d._id !== resource._id));
						this.get('toast').info('Document deleted');
						this.set('resourceToDelete', null);
						this.set('confirmDeleteResourceText', null);
					}).catch((error) => {
						this.get('application').showErrorMessage(error, 'Document could not be deleted');
					});
				}
				else if( service === 'action'){
					bridgeit.io.action.deleteAction({id: resource._id}).then(() => {
						let realm = this.get('model');
						realm.set('actions', realm.get('actions').filter((d) => d._id !== resource._id));
						this.get('toast').info('Action deleted');
						this.set('resourceToDelete', null);
						this.set('confirmDeleteResourceText', null);
					}).catch((error) => {
						this.get('application').showErrorMessage(error, 'Action could not be deleted');
					});
				}
				else if( service === 'eventhub'){
					if( path === 'handlers'){
						bridgeit.io.eventhub.deleteHandler({id: resource._id}).then(() => {
							let realm = this.get('model');
							realm.set('handlers', realm.get('handlers').filter((d) => d._id !== resource._id));
							this.get('toast').info('Handler deleted');
							this.set('resourceToDelete', null);
							this.set('confirmDeleteResourceText', null);
						}).catch((error) => {
							this.get('application').showErrorMessage(error, 'Event Hub Handler could not be deleted');
						});
					}
					else if( path === 'recognizers' ){
						bridgeit.io.eventhub.deleteRecognizer({id: resource._id}).then(() => {
							let realm = this.get('model');
							realm.set('recognizers', realm.get('recognizers').filter((d) => d._id !== resource._id));
							this.get('toast').info('Recognizer deleted');
							this.set('resourceToDelete', null);
							this.set('confirmDeleteResourceText', null);
						}).catch((error) => {
							this.get('application').showErrorMessage(error, 'Event Hub Recognizer could not be deleted');
						});
					}
					
				}
				else if( service === 'location'){
					if( path === 'poi'){
						bridgeit.io.location.deletePOI({id: resource._id}).then(() => {
							let realm = this.get('model');
							realm.set('pois', realm.get('pois').filter((d) => d._id !== resource._id));
							this.get('toast').info('POI deleted');
							this.set('resourceToDelete', null);
							this.set('confirmDeleteResourceText', null);
						}).catch((error) => {
							this.get('application').showErrorMessage(error, 'Point of Interest could not be deleted');
						});
					}
					else if( path === 'regions' ){
						bridgeit.io.location.deleteRegion({id: resource._id}).then(() => {
							let realm = this.get('model');
							realm.set('regions', realm.get('regions').filter((d) => d._id !== resource._id));
							this.get('toast').info('Region deleted');
							this.set('resourceToDelete', null);
							this.set('confirmDeleteResourceText', null);
						}).catch((error) => {
							this.get('application').showErrorMessage(error, 'Region could not be deleted');
						});
					}
					
				}
				
			}
		},

		onDenyDeleteResource: function(){
			this.set('resourceToDelete', null);
			this.set('confirmDeleteResourceText', null);
		},

		createNewResource: function(service, path){
			let resource = {};
			this.set('editingResource', true);
			this.set('selectedResource', resource);
			this.set('serviceForResource', service);
			this.set('showResourcePopup', true);
			this.set('selectedResourcePath', path);
			this.set('isCreatingNewResource', true);
		},

		showResourcePermissions: function(resource, service, path){
			this.set('selectedResource', resource);
			this.set('serviceForResource', service);
			this.set('showResourcePermissions', true);
			this.set('selectedResourcePath', path);
		},

		onCloseResourcePermissions: function(){
			this.set('selectedResource', null);
			this.set('serviceForResource', null);
			this.set('showResourcePermissions', false);
			this.set('selectedResourcePath', null);
		},

	}
});
