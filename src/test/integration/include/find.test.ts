'use strict';

import * as chai from 'chai';
import {Sequelize} from '../../../index';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../support';
const expect = chai.expect;
const Promise = Sequelize.Promise;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Include'), () => {
  describe('find', () => {
    it('should include a non required model, with conditions and two includes N:M 1:M', function( ) {
      const A = current.define<ItestInstance, ItestAttribute>('A', { name: new DataTypes.STRING(40) }, { paranoid: true });
      const B = current.define<ItestInstance, ItestAttribute>('B', { name: new DataTypes.STRING(40) }, { paranoid: true });
      const C = current.define<ItestInstance, ItestAttribute>('C', { name: new DataTypes.STRING(40) }, { paranoid: true });
      const D = current.define<ItestInstance, ItestAttribute>('D', { name: new DataTypes.STRING(40) }, { paranoid: true });

      // Associations
      A.hasMany(B);

      B.belongsTo(D);
      B.belongsToMany(C, {
        through: 'BC'
      });

      C.belongsToMany(B, {
        through: 'BC'
      });

      D.hasMany(B);

      return current.sync({ force: true }).then(() => {
        return A.find({
          include: [
            { model: B, required: false, include: [
              { model: C, required: false },
              { model: D },
            ]},
          ]
        });
      });
    });

    it('should work with a 1:M to M:1 relation with a where on the last include', function()  {
      const Model = current.define<ItestInstance, ItestAttribute>('Model', {});
      const Model2 = current.define<ItestInstance, ItestAttribute>('Model2', {});
      const Model4 = current.define<ItestInstance, ItestAttribute>('Model4', {something: { type: new DataTypes.INTEGER() }});

      Model.belongsTo(Model2);
      Model2.hasMany(Model);

      Model2.hasMany(Model4);
      Model4.belongsTo(Model2);

      return current.sync({force: true}).bind(this).then(() => {
        return Model.find({
          include: [
            {model: Model2, include: [
              {model: Model4, where: {something: 2}},
            ]},
          ]
        });
      });
    });

    it('should include a model with a where condition but no required', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {}, { paranoid: false });
      const Task = current.define<ItestInstance, ItestAttribute>('Task', {
        deletedAt: {
          type: new DataTypes.DATE()
        }
      }, { paranoid: false });

      User.hasMany(Task, {foreignKey: 'userId'});
      Task.belongsTo(User, {foreignKey: 'userId'});

      return current.sync({
        force: true
      }).then(() => {
        return User.create();
      }).then(user => {
        return Task.bulkCreate([
          {userId: user.get('id'), deletedAt: new Date()},
          {userId: user.get('id'), deletedAt: new Date()},
          {userId: user.get('id'), deletedAt: new Date()},
        ]);
      }).then(() => {
        return User.find({
          include: [
            {model: Task, where: {deletedAt: null}, required: false},
          ]
        });
      }).then(user => {
        expect(user).to.be.ok;
        expect(user.Tasks.length).to.equal(0);
      });
    });

    it('should include a model with a where clause when the PK field name and attribute name are different', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {
        id: {
          type: new DataTypes.UUID(),
          defaultValue: new DataTypes.UUIDV4(),
          field: 'main_id',
          primaryKey: true
        }
      });
      const Task = current.define<ItestInstance, ItestAttribute>('Task', {
        searchString: { type: new DataTypes.STRING() }
      });

      User.hasMany(Task, {foreignKey: 'userId'});
      Task.belongsTo(User, {foreignKey: 'userId'});

      return current.sync({
        force: true
      }).then(() => {
        return User.create();
      }).then(user => {
        return Task.bulkCreate([
          {userId: user.get('id'), searchString: 'one'},
          {userId: user.get('id'), searchString: 'two'},
        ]);
      }).then(() => {
        return User.find({
          include: [
            {model: Task, where: {searchString: 'one'} },
          ]
        });
      }).then(user => {
        expect(user).to.be.ok;
        expect(user.Tasks.length).to.equal(1);
      });
    });

    // je sais pas
    it('should include a model with a through.where and required true clause when the PK field name and attribute name are different', function() {
      const A = current.define<ItestInstance, ItestAttribute>('a', {});
      const B = current.define<ItestInstance, ItestAttribute>('b', {});
      const AB = current.define<ItestInstance, ItestAttribute>('a_b', {
        name: {
          type: new DataTypes.STRING(40),
          field: 'name_id',
          primaryKey: true
        }
      });

      A.belongsToMany(B, { through: AB });
      B.belongsToMany(A, { through: AB });

      return current
        .sync({force: true})
        .then(() => {
          return Promise.join(
            A.create({}),
            B.create({})
          );
        })
        .spread((a, b) => {
          return a.addLinkedData('b', b, { through: {name: 'Foobar'}});
        })
        .then(() => {
          return A.find({
            include: [
              {model: B, through: { where: {name: 'Foobar'} }, required: true },
            ]
          });
        })
        .then(a => {
          expect(a).to.not.equal(null);
          expect(a.get('bs')).to.have.length(1);
        });
    });


    it('should still pull the main record when an included model is not required and has where restrictions without matches', function() {
      const A = current.define<ItestInstance, ItestAttribute>('a', {
        name: new DataTypes.STRING(40)
      });
      const B = current.define<ItestInstance, ItestAttribute>('b', {
        name: new DataTypes.STRING(40)
      });

      A.belongsToMany(B, {through: 'a_b'});
      B.belongsToMany(A, {through: 'a_b'});

      return current
        .sync({force: true})
        .then(() => {
          return A.create({
            name: 'Foobar'
          });
        })
        .then(() => {
          return A.find({
            where: {name: 'Foobar'},
            include: [
              {model: B, where: {name: 'idontexist'}, required: false},
            ]
          });
        })
        .then(a => {
          expect(a).to.not.equal(null);
          expect(a.get('bs')).to.deep.equal([]);
        });
    });

    it('should support a nested include (with a where)', function() {
      const A = current.define<ItestInstance, ItestAttribute>('A', {
        name: new DataTypes.STRING()
      });

      const B = current.define<ItestInstance, ItestAttribute>('B', {
        flag: new DataTypes.BOOLEAN()
      });

      const C = current.define<ItestInstance, ItestAttribute>('C', {
        name: new DataTypes.STRING()
      });

      A.hasOne(B);
      B.belongsTo(A);

      B.hasMany(C);
      C.belongsTo(B);

      return current
        .sync({ force: true })
        .then(() => {
          return A.find({
            include: [
              {
                model: B,
                where: { flag: true },
                include: [
                  {
                    model: C
                  },
                ]
              },
            ]
          });
        })
        .then(a => {
          expect(a).to.not.exist;
        });
    });

    it('should support a belongsTo with the targetKey option', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', { username: new DataTypes.STRING() });
      const Task = current.define<ItestInstance, ItestAttribute>('Task', { title: new DataTypes.STRING() });
      User.removeAttribute('id');
      Task.belongsTo(User, { foreignKey: 'user_name', targetKey: 'username'});

      return current.sync({ force: true }).then(() => {
        return User.create({ username: 'bob' }).then(newUser => {
          return Task.create({ title: 'some task' }).then(newTask => {
            return newTask.setLinkedData('User', newUser).then(() => {
              return Task.find({
                where: { title: 'some task' },
                include: [{ model: User }]
              })
                .then(foundTask => {
                  expect(foundTask).to.be.ok;
                  expect(foundTask.User.username).to.equal('bob');
                });
            });
          });
        });
      });
    });

    it('should support many levels of belongsTo (with a lower level having a where)', function() {
      const A = current.define<ItestInstance, ItestAttribute>('a', {});
      const B = current.define<ItestInstance, ItestAttribute>('b', {});
      const C = current.define<ItestInstance, ItestAttribute>('c', {});
      const D = current.define<ItestInstance, ItestAttribute>('d', {});
      const E = current.define<ItestInstance, ItestAttribute>('e', {});
      const F = current.define<ItestInstance, ItestAttribute>('f', {});
      const G = current.define<ItestInstance, ItestAttribute>('g', {
        name: new DataTypes.STRING()
      });
      const H = current.define<ItestInstance, ItestAttribute>('h', {
        name: new DataTypes.STRING()
      });

      A.belongsTo(B);
      B.belongsTo(C);
      C.belongsTo(D);
      D.belongsTo(E);
      E.belongsTo(F);
      F.belongsTo(G);
      G.belongsTo(H);

      return current.sync({force: true}).then(() => {
        return (Promise as any).join(
          A.create({}),
          (function(singles) {
            let promise = Promise.resolve();
            let previousInstance : ItestInstance;
            let b;

            singles.forEach(model => {
              const values = {
                name: undefined
              };

              if (model.name === 'g') {
                values.name = 'yolo';
              }

              promise = promise.then(() => {
                return model.create(values).then(instance => {
                  if (previousInstance) {
                    return previousInstance.setLinkedData(model, instance).then(() => {
                      previousInstance = instance;
                    });
                  } else {
                    previousInstance = b = instance;
                  }
                });
              });
            });

            promise = promise.then(() => {
              return b;
            });

            return promise;
          })([B, C, D, E, F, G, H])
        ).spread((a, b) => {
          return a.setLinkedData('b',  b);
        }).then(() => {
          return A.find({
            include: [
              {model: B, include: [
                {model: C, include: [
                  {model: D, include: [
                    {model: E, include: [
                      {model: F, include: [
                        {model: G, where: {
                          name: 'yolo'
                        }, include: [
                          {model: H},
                        ]},
                      ]},
                    ]},
                  ]},
                ]},
              ]},
            ]
          }).then(a => {
            expect(a.b.c.d.e.f.g.h).to.be.ok;
          });
        });
      });
    });

    it('should work with combinding a where and a scope', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {
        id: { type: new DataTypes.INTEGER(), primaryKey: true, autoIncrement: true },
        name: new DataTypes.STRING()
      }, { underscored: true });

      const Post = current.define<ItestInstance, ItestAttribute>('Post', {
        id: { type: new DataTypes.INTEGER(), primaryKey: true, autoIncrement: true, unique: true },
        owner_id: { type: new DataTypes.INTEGER(), unique: 'combiIndex' },
        owner_type: { type: new DataTypes.ENUM(), values: ['user', 'org'], defaultValue: 'user', unique: 'combiIndex' },
        private: { type: new DataTypes.BOOLEAN(), defaultValue: false }
      }, { underscored: true });

      User.hasMany(Post, { foreignKey: 'owner_id', scope: { owner_type: 'user'  }, as: 'UserPosts', constraints: false });
      Post.belongsTo(User, { foreignKey: 'owner_id', as: 'Owner', constraints: false });

      return current.sync({force: true}).then(() => {
        return User.find({
          where: { id: 2 },
          include: [
            { model: Post, as: 'UserPosts', where: {private: true} },
          ]
        });
      });
    });
  });
});
