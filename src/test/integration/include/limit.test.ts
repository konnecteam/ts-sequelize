'use strict';

import * as chai from 'chai';
import { Model, Sequelize } from '../../../index';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const Promise = Sequelize.Promise;
const Op = Sequelize.Op;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Include'), () => {
  let User : Model<ItestInstance, ItestAttribute>;
  let Project : Model<ItestInstance, ItestAttribute>;
  let Task : Model<ItestInstance, ItestAttribute>;
  let Hobby : Model<ItestInstance, ItestAttribute>;
  let Post : Model<ItestInstance, ItestAttribute>;
  let Tag : Model<ItestInstance, ItestAttribute>;
  let Color : Model<ItestInstance, ItestAttribute>;
  let Footnote : Model<ItestInstance, ItestAttribute>;
  let Comment : Model<ItestInstance, ItestAttribute>;

  describe('LIMIT', () => {
    /*
     * shortcut for building simple {name: 'foo'} seed data
     */
    function build(...args) {
      return Array.prototype.slice.call(arguments).map(arg => ({name: arg}));
    }

    /*
     * association overview
     * [Task]N---N[Project]N---N[User]N---N[Hobby]
     *                            1
     *                            |
     *                            |
     *                            |
     *                            N
     *            [Comment]N---1[Post]N---N[Tag]N---1[Color]
     *                            1
     *                            |
     *                            |
     *                            |
     *                            N
     *                        [Footnote]
     */
    beforeEach(function() {
      Project = current.define<ItestInstance, ItestAttribute>('Project', {
        name: {
          type: new DataTypes.STRING(),
          primaryKey: true
        }
      }, {timestamps: false});

      User = current.define<ItestInstance, ItestAttribute>('User', {
        name: {
          type: new DataTypes.STRING(),
          primaryKey: true
        }
      }, {timestamps: false});

      Task = current.define<ItestInstance, ItestAttribute>('Task', {
        name: {
          type: new DataTypes.STRING(),
          primaryKey: true
        }
      }, {timestamps: false});

      Hobby = current.define<ItestInstance, ItestAttribute>('Hobby', {
        name: {
          type: new DataTypes.STRING(),
          primaryKey: true
        }
      }, {timestamps: false});

      User.belongsToMany(Project, {through: 'user_project'});
      Project.belongsToMany(User, {through: 'user_project'});

      Project.belongsToMany(Task, {through: 'task_project'});
      Task.belongsToMany(Project, {through: 'task_project'});

      User.belongsToMany(Hobby, {through: 'user_hobby'});
      Hobby.belongsToMany(User, {through: 'user_hobby'});

      Post = current.define<ItestInstance, ItestAttribute>('Post', {
        name: {
          type: new DataTypes.STRING(),
          primaryKey: true
        }
      }, {timestamps: false});

      Comment = current.define<ItestInstance, ItestAttribute>('Comment', {
        name: {
          type: new DataTypes.STRING(),
          primaryKey: true
        }
      }, {timestamps: false});

      Tag = current.define<ItestInstance, ItestAttribute>('Tag', {
        name: {
          type: new DataTypes.STRING(),
          primaryKey: true
        }
      }, {timestamps: false});

      Color = current.define<ItestInstance, ItestAttribute>('Color', {
        name: {
          type: new DataTypes.STRING(),
          primaryKey: true
        }
      }, {timestamps: false});

      Footnote = current.define<ItestInstance, ItestAttribute>('Footnote', {
        name: {
          type: new DataTypes.STRING(),
          primaryKey: true
        }
      }, {timestamps: false});

      Post.hasMany(Comment);
      Comment.belongsTo(Post);

      Post.belongsToMany(Tag, {through: 'post_tag'});
      Tag.belongsToMany(Post, {through: 'post_tag'});

      Post.hasMany(Footnote);
      Footnote.belongsTo(Post);

      User.hasMany(Post);
      Post.belongsTo(User);

      Tag.belongsTo(Color);
      Color.hasMany(Tag);
    });

    /*
     * many-to-many
     */
    it('supports many-to-many association with where clause', function() {
      return current.sync({ force: true })
        .then(() => Promise.join(
          Project.bulkCreate(build('alpha', 'bravo', 'charlie')),
          User.bulkCreate(build('Alice', 'Bob'))
        ))
        .spread((projects, users) => Promise.join(
          projects[0].addLinkedData('User', users[0]),
          projects[1].addLinkedData('User', users[1]),
          projects[2].addLinkedData('User', users[0])
        ))
        .then(() => Project.findAll({
          include: [{
            model: User,
            where: {
              name: 'Alice'
            }
          }],
          order: ['name'],
          limit: 1,
          offset: 1
        }))
        .then(result => {
          expect(result.length).to.equal(1);
          expect(result[0].name).to.equal('charlie');
        });
    });

    it('supports 2 levels of required many-to-many associations', function() {
      return current.sync({ force: true })
        .then(() => Promise.join(
          Project.bulkCreate(build('alpha', 'bravo', 'charlie')),
          User.bulkCreate(build('Alice', 'Bob')),
          Hobby.bulkCreate(build('archery', 'badminton'))
        ))
        .spread((projects, users, hobbies) => Promise.join(
          projects[0].addLinkedData('User', users[0]),
          projects[1].addLinkedData('User', users[1]),
          projects[2].addLinkedData('User', users[0]),
          users[0].addLinkedData('Hobby', hobbies[0])
        ))
        .then(() =>
        Project.findAll({
          include: [{
            model: User,
            required: true,
            include: [{
              model: Hobby,
              required: true
            }]
          }],
          order: ['name'],
          limit: 1,
          offset: 1
        }))
        .then(result => {
          expect(result.length).to.equal(1);
          expect(result[0].name).to.equal('charlie');
        });
    });

    it('supports 2 levels of required many-to-many associations with where clause', function() {
      return current.sync({ force: true })
        .then(() => Promise.join(
          Project.bulkCreate(build('alpha', 'bravo', 'charlie')),
          User.bulkCreate(build('Alice', 'Bob')),
          Hobby.bulkCreate(build('archery', 'badminton'))
        ))
        .spread((projects, users, hobbies) => Promise.join(
          projects[0].addLinkedData('User', users[0]),
          projects[1].addLinkedData('User', users[1]),
          projects[2].addLinkedData('User', users[0]),
          users[0].addLinkedData('Hobby', hobbies[0]),
          users[1].addLinkedData('Hobby', hobbies[1])
        ))
        .then(() => Project.findAll({
          include: [{
            model: User,
            required: true,
            include: [{
              model: Hobby,
              where: {
                name: 'archery'
              }
            }]
          }],
          order: ['name'],
          limit: 1,
          offset: 1
        }))
        .then(result => {
          expect(result.length).to.equal(1);
          expect(result[0].name).to.equal('charlie');
        });
    });

    it('supports 2 levels of required many-to-many associations with through.where clause', function() {
      return current.sync({ force: true })
        .then(() => Promise.join(
          Project.bulkCreate(build('alpha', 'bravo', 'charlie')),
          User.bulkCreate(build('Alice', 'Bob')),
          Hobby.bulkCreate(build('archery', 'badminton'))
        ))
        .spread((projects, users, hobbies) => Promise.join(
          projects[0].addLinkedData('User', users[0]),
          projects[1].addLinkedData('User', users[1]),
          projects[2].addLinkedData('User', users[0]),
          users[0].addLinkedData('Hobby', hobbies[0]),
          users[1].addLinkedData('Hobby', hobbies[1])
        ))
        .then(() => Project.findAll({
          include: [{
            model: User,
            required: true,
            include: [{
              model: Hobby,
              required: true,
              through: {
                where: {
                  HobbyName: 'archery'
                }
              }
            }]
          }],
          order: ['name'],
          limit: 1,
          offset: 1
        }))
        .then(result => {
          expect(result.length).to.equal(1);
          expect(result[0].name).to.equal('charlie');
        });
    });

    it('supports 3 levels of required many-to-many associations with where clause', function() {
      return current.sync({ force: true })
        .then(() => Promise.join(
          Task.bulkCreate(build('alpha', 'bravo', 'charlie')),
          Project.bulkCreate(build('alpha', 'bravo', 'charlie')),
          User.bulkCreate(build('Alice', 'Bob', 'Charlotte')),
          Hobby.bulkCreate(build('archery', 'badminton'))
        ))
        .spread((tasks, projects, users, hobbies) => Promise.join(
          tasks[0].addLinkedData('Project', projects[0]),
          tasks[1].addLinkedData('Project', projects[1]),
          tasks[2].addLinkedData('Project', projects[2]),
          projects[0].addLinkedData('User', users[0]),
          projects[1].addLinkedData('User', users[1]),
          projects[2].addLinkedData('User', users[0]),
          users[0].addLinkedData('Hobby', hobbies[0]),
          users[1].addLinkedData('Hobby', hobbies[1])
        ))
        .then(() => Task.findAll({
          include: [{
            model: Project,
            required: true,
            include: [{
              model: User,
              required: true,
              include: [{
                model: Hobby,
                where: {
                  name: 'archery'
                }
              }]
            }]
          }],
          order: ['name'],
          limit: 1,
          offset: 1
        }))
        .then(result => {
          expect(result.length).to.equal(1);
          expect(result[0].name).to.equal('charlie');
        });
    });

    it('supports required many-to-many association', function() {
      return current.sync({ force: true })
        .then(() => Promise.join(
          Project.bulkCreate(build('alpha', 'bravo', 'charlie')),
          User.bulkCreate(build('Alice', 'Bob'))
        ))
        .spread((projects, users) => Promise.join(
          projects[0].addLinkedData('User', users[0]), // alpha
          projects[2].addLinkedData('User', users[0]) // charlie
        ))
        .then(() => Project.findAll({
          include: [{
            model: User,
            required: true
          }],
          order: ['name'],
          limit: 1,
          offset: 1
        }))
        .then(result => {
          expect(result.length).to.equal(1);
          expect(result[0].name).to.equal('charlie');
        });
    });

    it('supports 2 required many-to-many association', function() {
      return current.sync({ force: true })
        .then(() => Promise.join(
          Project.bulkCreate(build('alpha', 'bravo', 'charlie', 'delta')),
          User.bulkCreate(build('Alice', 'Bob', 'David')),
          Task.bulkCreate(build('a', 'c', 'd'))
        ))
        .spread((projects, users, tasks) => Promise.join(
          projects[0].addLinkedData('User', users[0]),
          projects[0].addLinkedData('Task', tasks[0]),
          projects[1].addLinkedData('User', users[1]),
          projects[2].addLinkedData('Task', tasks[1]),
          projects[3].addLinkedData('User', users[2]),
          projects[3].addLinkedData('Task', tasks[2])
        ))
        .then(() => Project.findAll({
          include: [{
            model: User,
            required: true
          }, {
            model: Task,
            required: true
          }],
          order: ['name'],
          limit: 1,
          offset: 1
        }))
        .then(result => {
          expect(result.length).to.equal(1);
          expect(result[0].name).to.equal('delta');
        });
    });

    /*
     * one-to-many
     */
    it('supports required one-to-many association', function() {
      return current.sync({ force: true })
        .then(() => Promise.join(
          Post.bulkCreate(build('alpha', 'bravo', 'charlie')),
          Comment.bulkCreate(build('comment0', 'comment1'))
        ))
        .spread((posts, comments) => Promise.join(
          posts[0].addLinkedData('Comment', comments[0]),
          posts[2].addLinkedData('Comment', comments[1])
        ))
        .then(() => Post.findAll({
          include: [{
            model: Comment,
            required: true
          }],
          order: ['name'],
          limit: 1,
          offset: 1
        }))
        .then(result => {
          expect(result.length).to.equal(1);
          expect(result[0].name).to.equal('charlie');
        });
    });

    it('supports required one-to-many association with where clause', function() {
      return current.sync({ force: true })
        .then(() => Promise.join(
          Post.bulkCreate(build('alpha', 'bravo', 'charlie')),
          Comment.bulkCreate(build('comment0', 'comment1', 'comment2'))
        ))
        .spread((posts, comments) => Promise.join(
          posts[0].addLinkedData('Comment', comments[0]),
          posts[1].addLinkedData('Comment', comments[1]),
          posts[2].addLinkedData('Comment', comments[2])
        ))
        .then(() => Post.findAll({
          include: [{
            model: Comment,
            required: true,
            where: {
              [Op.or]: [{
                name: 'comment0'
              }, {
                name: 'comment2'
              }]
            }
          }],
          order: ['name'],
          limit: 1,
          offset: 1
        }))
        .then(result => {
          expect(result.length).to.equal(1);
          expect(result[0].name).to.equal('charlie');
        });
    });

    it('supports required one-to-many association with where clause (findOne)', function() {
      return current.sync({ force: true })
        .then(() => Promise.join(
          Post.bulkCreate(build('alpha', 'bravo', 'charlie')),
          Comment.bulkCreate(build('comment0', 'comment1', 'comment2'))
        ))
        .spread((posts, comments) => Promise.join(
          posts[0].addLinkedData('Comment', comments[0]),
          posts[1].addLinkedData('Comment', comments[1]),
          posts[2].addLinkedData('Comment', comments[2])
        ))
        .then(() => Post.findOne({
          include: [{
            model: Comment,
            required: true,
            where: {
              name: 'comment2'
            }
          }]
        }))
        .then(post => {
          expect(post.name).to.equal('charlie');
        });
    });

    it('supports 2 levels of required one-to-many associations', function() {
      return current.sync({ force: true })
        .then(() => Promise.join(
          User.bulkCreate(build('Alice', 'Bob', 'Charlotte', 'David')),
          Post.bulkCreate(build('post0', 'post1', 'post2')),
          Comment.bulkCreate(build('comment0', 'comment1', 'comment2'))
        ))
        .spread((users, posts, comments) => Promise.join(
          users[0].addLinkedData('Post', posts[0]),
          users[1].addLinkedData('Post', posts[1]),
          users[3].addLinkedData('Post', posts[2]),
          posts[0].addLinkedData('Comment', comments[0]),
          posts[2].addLinkedData('Comment', comments[2])
        ))
        .then(() => User.findAll({
          include: [{
            model: Post,
            required: true,
            include: [{
              model: Comment,
              required: true
            }]
          }],
          order: ['name'],
          limit: 1,
          offset: 1
        }))
        .then(result => {
          expect(result.length).to.equal(1);
          expect(result[0].name).to.equal('David');
        });
    });

    /*
     * mixed many-to-many, one-to-many and many-to-one
     */
    it('supports required one-to-many association with nested required many-to-many association', function() {
      return current.sync({ force: true })
        .then(() => Promise.join(
          User.bulkCreate(build('Alice', 'Bob', 'Charlotte', 'David')),
          Post.bulkCreate(build('alpha', 'charlie', 'delta')),
          Tag.bulkCreate(build('atag', 'btag', 'dtag'))
        ))
        .spread((users, posts, tags) => Promise.join(
          users[0].addLinkedData('Post', posts[0]),
          users[2].addLinkedData('Post', posts[1]),
          users[3].addLinkedData('Post', posts[2]),

          posts[0].addLinkedData('Tag', [tags[0]]),
          posts[2].addLinkedData('Tag', [tags[2]])
        ))
        .then(() => User.findAll({
          include: [{
            model: Post,
            required: true,
            include: [{
              model: Tag,
              required: true
            }]
          }],
          order: ['name'],
          limit: 1,
          offset: 1
        }))
        .then(result => {
          expect(result.length).to.equal(1);
          expect(result[0].name).to.equal('David');
        });
    });

    it('supports required many-to-many association with nested required one-to-many association', function() {
      return current.sync({ force: true })
        .then(() => Promise.join(
          Project.bulkCreate(build('alpha', 'bravo', 'charlie', 'delta')),
          User.bulkCreate(build('Alice', 'Bob', 'David')),
          Post.bulkCreate(build('post0', 'post1', 'post2'))
        ))
        .spread((projects, users, posts) => Promise.join(
          projects[0].addLinkedData('User', users[0]),
          projects[1].addLinkedData('User', users[1]),
          projects[3].addLinkedData('User', users[2]),

          users[0].addLinkedData('Post', [posts[0]]),
          users[2].addLinkedData('Post', [posts[2]])
        ))
        .then(() => Project.findAll({
          include: [{
            model: User,
            required: true,
            include: [{
              model: Post,
              required: true,
              duplicating: true
            }]
          }],
          order: ['name'],
          limit: 1,
          offset: 1
        }))
        .then(result => {
          expect(result.length).to.equal(1);
          expect(result[0].name).to.equal('delta');
        });
    });

    it('supports required many-to-one association with nested many-to-many association with where clause', function() {
      return current.sync({ force: true })
        .then(() => Promise.join(

          Post.bulkCreate(build('post0', 'post1', 'post2', 'post3')),
          User.bulkCreate(build('Alice', 'Bob', 'Charlotte', 'David')),
          Hobby.bulkCreate(build('archery', 'badminton'))
        ))
        .spread((posts, users, hobbies) => Promise.join(
          posts[0].setLinkedData('User', users[0]),
          posts[1].setLinkedData('User', users[1]),
          posts[3].setLinkedData('User', users[3]),
          users[0].addLinkedData('Hobby', hobbies[0]),
          users[1].addLinkedData('Hobby', hobbies[1]),
          users[3].addLinkedData('Hobby', hobbies[0])
        ))
        .then(() => Post.findAll({
          include: [{
            model: User,
            required: true,
            include: [{
              model: Hobby,
              where: {
                name: 'archery'
              }
            }]
          }],
          order: ['name'],
          limit: 1,
          offset: 1
        }))
        .then(result => {
          expect(result.length).to.equal(1);
          expect(result[0].name).to.equal('post3');
        });
    });

    it('supports required many-to-one association with nested many-to-many association with through.where clause', function() {
      return current.sync({ force: true })
        .then(() => Promise.join(

          Post.bulkCreate(build('post0', 'post1', 'post2', 'post3')),
          User.bulkCreate(build('Alice', 'Bob', 'Charlotte', 'David')),
          Hobby.bulkCreate(build('archery', 'badminton'))
        ))
        .spread((posts, users, hobbies) => Promise.join(
          posts[0].setLinkedData('User', users[0]),
          posts[1].setLinkedData('User', users[1]),
          posts[3].setLinkedData('User', users[3]),
          users[0].addLinkedData('Hobby', hobbies[0]),
          users[1].addLinkedData('Hobby', hobbies[1]),
          users[3].addLinkedData('Hobby', hobbies[0])
        ))
        .then(() => Post.findAll({
          include: [{
            model: User,
            required: true,
            include: [{
              model: Hobby,
              required: true,
              through: {
                where: {
                  HobbyName: 'archery'
                }
              }
            }]
          }],
          order: ['name'],
          limit: 1,
          offset: 1
        }))
        .then(result => {
          expect(result.length).to.equal(1);
          expect(result[0].name).to.equal('post3');
        });
    });

    it('supports required many-to-one association with multiple nested associations with where clause', function() {
      return current.sync({ force: true })
        .then(() => Promise.join(

          Comment.bulkCreate(build('comment0', 'comment1', 'comment2', 'comment3', 'comment4', 'comment5')),
          Post.bulkCreate(build('post0', 'post1', 'post2', 'post3', 'post4')),
          User.bulkCreate(build('Alice', 'Bob')),
          Tag.bulkCreate(build('tag0', 'tag1'))
        ))
        .spread((comments, posts, users, tags) => Promise.join(
          comments[0].setLinkedData('Post', posts[0]),
          comments[1].setLinkedData('Post', posts[1]),
          comments[3].setLinkedData('Post', posts[2]),
          comments[4].setLinkedData('Post', posts[3]),
          comments[5].setLinkedData('Post', posts[4]),

          posts[0].addLinkedData('Tag', tags[0]),
          posts[3].addLinkedData('Tag', tags[0]),
          posts[4].addLinkedData('Tag', tags[0]),
          posts[1].addLinkedData('Tag', tags[1]),

          posts[0].setLinkedData('User', users[0]),
          posts[2].setLinkedData('User', users[0]),
          posts[4].setLinkedData('User', users[0]),
          posts[1].setLinkedData('User', users[1])
        ))
        .then(() => Comment.findAll({
          include: [{
            model: Post,
            required: true,
            include: [{
              model: User,
              where: {
                name: 'Alice'
              }
            }, {
              model: Tag,
              where: {
                name: 'tag0'
              }
            }]
          }],
          order: ['name'],
          limit: 1,
          offset: 1
        }))
        .then(result => {
          expect(result.length).to.equal(1);
          expect(result[0].name).to.equal('comment5');
        });
    });

    it('supports required many-to-one association with nested one-to-many association with where clause', function() {
      return current.sync({ force: true })
        .then(() => Promise.join(

          Comment.bulkCreate(build('comment0', 'comment1', 'comment2')),
          Post.bulkCreate(build('post0', 'post1', 'post2')),
          Footnote.bulkCreate(build('footnote0', 'footnote1', 'footnote2'))
        ))
        .spread((comments, posts, footnotes) => Promise.join(
          comments[0].setLinkedData('Post', posts[0]),
          comments[1].setLinkedData('Post', posts[1]),
          comments[2].setLinkedData('Post', posts[2]),
          posts[0].addLinkedData('Footnote', footnotes[0]),
          posts[1].addLinkedData('Footnote', footnotes[1]),
          posts[2].addLinkedData('Footnote', footnotes[2])
        ))
        .then(() => Comment.findAll({
          include: [{
            model: Post,
            required: true,
            include: [{
              model: Footnote,
              where: {
                [Op.or]: [{
                  name: 'footnote0'
                }, {
                  name: 'footnote2'
                }]
              }
            }]
          }],
          order: ['name'],
          limit: 1,
          offset: 1
        }))
        .then(result => {
          expect(result.length).to.equal(1);
          expect(result[0].name).to.equal('comment2');
        });
    });
  });
});
