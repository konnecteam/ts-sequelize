'use strict';

import * as chai from 'chai';
import { Model, Sequelize } from '../../../index';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../support';
const expect = chai.expect;
const Promise = Sequelize.Promise;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('associations'), () => {
  let Post : Model<ItestInstance, ItestAttribute>;
  let Image : Model<ItestInstance, ItestAttribute>;
  let Question : Model<ItestInstance, ItestAttribute>;
  let Comment : Model<ItestInstance, ItestAttribute>;
  let Tag : Model<ItestInstance, ItestAttribute>;
  let ItemTag : Model<ItestInstance, ItestAttribute>;
  let PostTag : Model<ItestInstance, ItestAttribute>;
  let post : ItestInstance;
  let image : ItestInstance;
  let question : ItestInstance;
  let mainComment : ItestInstance;
  let postA : ItestInstance;
  let postB : ItestInstance;
  let postC : ItestInstance;
  describe('scope', () => {
    beforeEach(function() {
      Post = current.define<ItestInstance, ItestAttribute>('post', {});
      Image = current.define<ItestInstance, ItestAttribute>('image', {});
      Question = current.define<ItestInstance, ItestAttribute>('question', {});
      Comment = current.define<ItestInstance, ItestAttribute>('comment', {
        title: new DataTypes.STRING(),
        type: new DataTypes.STRING(),
        commentable: new DataTypes.STRING(),
        commentable_id: new DataTypes.INTEGER(),
        isMain: {
          type: new DataTypes.BOOLEAN(),
          defaultValue: false
        }
      });

      Comment.dataSetsMethods.getItem = function() {
        return this.getLinkedData(this.get('commentable').substr(0, 1) + this.get('commentable').substr(1));
      };

      Post.addScope('withComments', {
        include: [Comment]
      });
      Post.addScope('withMainComment', {
        include: [{
          model: Comment,
          as: 'mainComment'
        }]
      });
      Post.hasMany(Comment, {
        foreignKey: 'commentable_id',
        scope: {
          commentable: 'post'
        },
        constraints: false
      });
      Post.hasMany(Comment, {
        foreignKey: 'commentable_id',
        as: 'coloredComments',
        scope: {
          commentable: 'post',
          type: { in: ['blue', 'green'] }
        },
        constraints: false
      });
      Post.hasOne(Comment, {
        foreignKey: 'commentable_id',
        as: 'mainComment',
        scope: {
          commentable: 'post',
          isMain: true
        },
        constraints: false
      });
      Comment.belongsTo(Post, {
        foreignKey: 'commentable_id',
        as: 'post',
        constraints: false
      });

      Image.hasMany(Comment, {
        foreignKey: 'commentable_id',
        scope: {
          commentable: 'image'
        },
        constraints: false
      });
      Comment.belongsTo(Image, {
        foreignKey: 'commentable_id',
        as: 'image',
        constraints: false
      });

      Question.hasMany(Comment, {
        foreignKey: 'commentable_id',
        scope: {
          commentable: 'question'
        },
        constraints: false
      });
      Comment.belongsTo(Question, {
        foreignKey: 'commentable_id',
        as: 'question',
        constraints: false
      });
    });

    describe('1:1', () => {
      it('should create, find and include associations with scope values', function() {
        return current.sync({force: true}).then(() => {
          return Promise.join(
            Post.create(),
            Comment.create({
              title: 'I am a comment'
            }),
            Comment.create({
              title: 'I am a main comment',
              isMain: true
            })
          );
        }).bind(this).spread(function(_post) {
          post = _post;
          return post.createLinkedData<ItestInstance, ItestAttribute>('comment', {
            title: 'I am a post comment'
          });
        }).then(function(comment) {
          expect(comment.get('commentable')).to.equal('post');
          expect(comment.get('isMain')).to.be.false;
          return Post.scope('withMainComment').findById(post.get('id'));
        }).then(_post => {
          expect(_post.mainComment).to.be.null;
          return _post.createLinkedData({ model : 'comment', associationAlias : 'mainComment' }, {
            title: 'I am a main post comment'
          });
        }).then(function(_mainComment) {
          mainComment = _mainComment;
          expect(mainComment.get('commentable')).to.equal('post');
          expect(mainComment.get('isMain')).to.be.true;
          return Post.scope('withMainComment').findById(post.id);
        }).then(function(_post) {
          expect(_post.mainComment.get('id')).to.equal(mainComment.get('id'));
          return _post.getLinkedData({ model : 'comment', associationAlias : 'mainComment' });
        }).then(function(_mainComment) {
          expect(_mainComment.get('commentable')).to.equal('post');
          expect(_mainComment.get('isMain')).to.be.true;
          return Comment.create({
            title: 'I am a future main comment'
          });
        }).then(function(comment) {
          return post.setLinkedData({ model : 'comment', associationAlias : 'mainComment' }, comment);
        }).then( function() {
          return post.getLinkedData({ model : 'comment', associationAlias : 'mainComment' });
        }).then(_mainComment => {
          expect(_mainComment.get('commentable')).to.equal('post');
          expect(_mainComment.get('isMain')).to.be.true;
          expect(_mainComment.get('title')).to.equal('I am a future main comment');
        });
      });
      it('should create included association with scope values', function() {
        return current.sync({force: true}).then(() => {
          return Post.create({
            mainComment: {
              title: 'I am a main comment created with a post'
            }
          }, {
            include: [{model: Comment, as: 'mainComment'}]
          });
        }).then(_post => {
          expect(_post.mainComment.get('commentable')).to.equal('post');
          expect(_post.mainComment.get('isMain')).to.be.true;
          return Post.scope('withMainComment').findById(_post.id);
        }).then(_post => {
          expect(_post.mainComment.get('commentable')).to.equal('post');
          expect(_post.mainComment.get('isMain')).to.be.true;
        });
      });
    });

    describe('1:M', () => {
      it('should create, find and include associations with scope values', function() {
        return current.sync({force: true}).then(() => {
          return Promise.join(
            Post.create(),
            Image.create(),
            Question.create(),
            Comment.create({
              title: 'I am a image comment'
            }),
            Comment.create({
              title: 'I am a question comment'
            })
          );
        }).bind(this).spread(function(_post, _image, _question, commentA, commentB) {
          post = _post;
          image = _image;
          question = _question;
          return Promise.join(
            post.createLinkedData<ItestInstance, ItestAttribute>('comment', {
              title: 'I am a post comment'
            }),
            image.addLinkedData('comment', commentA),
            question.setLinkedData('comment', [commentB])
          );
        }).then(() => {
          return Comment.findAll();
        }).then(comments => {
          comments.forEach(comment => {
            expect(comment.get('commentable')).to.be.ok;
          });
          expect(comments.map(comment => {
            return comment.get('commentable');
          }).sort()).to.deep.equal(['image', 'post', 'question']);
        }).then(function() {
          return Promise.join(
            post.getManyLinkedData<ItestInstance, ItestAttribute>('comment'),
            image.getManyLinkedData<ItestInstance, ItestAttribute>('comment'),
            question.getManyLinkedData<ItestInstance, ItestAttribute>('comment')
          );
        }).spread((postComments, imageComments, questionComments) => {
          expect(postComments.length).to.equal(1);
          expect(postComments[0].get('title')).to.equal('I am a post comment');
          expect(imageComments.length).to.equal(1);
          expect(imageComments[0].get('title')).to.equal('I am a image comment');
          expect(questionComments.length).to.equal(1);
          expect(questionComments[0].get('title')).to.equal('I am a question comment');

          return [postComments[0], imageComments[0], questionComments[0]];
        }).spread((postComment, imageComment, questionComment) => {
          return Promise.join(
            postComment.getItem(),
            imageComment.getItem(),
            questionComment.getItem()
          );
        }).spread((_post, _image, _question) => {
          expect(_post.model).to.equal(Post);
          expect(_image.model).to.equal(Image);
          expect(_question.model).to.equal(Question);
        }).then(() => {
          return Promise.join(
            Post.find({
              include: [Comment]
            }),
            Image.findOne({
              include: [Comment]
            }),
            Question.findOne({
              include: [Comment]
            })
          );
        }).spread((_post, _image, _question) => {
          expect(_post.comments.length).to.equal(1);
          expect(_post.comments[0].get('title')).to.equal('I am a post comment');
          expect(_image.comments.length).to.equal(1);
          expect(_image.comments[0].get('title')).to.equal('I am a image comment');
          expect(_question.comments.length).to.equal(1);
          expect(_question.comments[0].get('title')).to.equal('I am a question comment');
        });
      });
      it('should make the same query if called multiple time (#4470)', function() {
        const logs = [];
        const logging = function(log) {
          logs.push(log);
        };

        return current.sync({force: true}).then(() => {
          return Post.create();
        }).then(_post => {
          return _post.createLinkedData<ItestInstance, ItestAttribute>('comment', {
            title: 'I am a post comment'
          });
        }).then(() => {
          return Post.scope('withComments').findAll({
            logging
          });
        }).then(() => {
          return Post.scope('withComments').findAll({
            logging
          });
        }).then(() => {
          expect(logs[0]).to.equal(logs[1]);
        });
      });
      it('should created included association with scope values', function() {
        return current.sync({force: true}).then(() => {
          return Post.create({
            comments: [{
              title: 'I am a comment created with a post'
            }, {
              title: 'I am a second comment created with a post'
            }]
          }, {
            include: [{model: Comment, as: 'comments'}]
          });
        }).then(_post => {
          post = _post;
          return post.comments;
        }).each(comment => {
          expect((comment as ItestInstance).get('commentable')).to.equal('post');
        }).then(() => {
          return Post.scope('withComments').findById(post.id);
        }).then(_post => {
          return _post.getLinkedData<ItestInstance, ItestAttribute>('comment');
        }).each(comment => {
          expect((comment as ItestInstance).get('commentable')).to.equal('post');
        });
      });
      it('should include associations with operator scope values', function() {
        return current.sync({force: true}).then(() => {
          return Promise.join(
            Post.create(),
            Comment.create({
              title: 'I am a blue comment',
              type: 'blue'
            }),
            Comment.create({
              title: 'I am a red comment',
              type: 'red'
            }),
            Comment.create({
              title: 'I am a green comment',
              type: 'green'
            })
          );
        }).spread((_post, commentA, commentB, commentC) => {
          post = _post;
          return post.addLinkedData('comment', [commentA, commentB, commentC]);
        }).then(() => {
          return Post.findById(post.id, {
            include: [{
              model: Comment,
              as: 'coloredComments'
            }]
          });
        }).then(_post => {
          expect(_post.coloredComments.length).to.equal(2);
          for (const comment of _post.coloredComments) {
            expect(comment.type).to.match(/blue|green/);
          }
        });
      });
    });

    if (Support.getTestDialect() !== 'sqlite') {
      describe('N:M', () => {
        describe('on the target', () => {
          beforeEach(function() {
            Post = current.define<ItestInstance, ItestAttribute>('post', {});
            Tag = current.define<ItestInstance, ItestAttribute>('tag', {
              type: new DataTypes.STRING()
            });
            PostTag = current.define<ItestInstance, ItestAttribute>('post_tag');

            Tag.belongsToMany(Post, {through: PostTag});
            Post.belongsToMany(Tag, {as: 'categories', through: PostTag, scope: { type: 'category' }});
            Post.belongsToMany(Tag, {as: 'tags', through: PostTag, scope: { type: 'tag' }});
          });

          it('should create, find and include associations with scope values', function() {
            return Promise.join(
              Post.sync({force: true}),
              Tag.sync({force: true})
            ).bind(this).then(() => {
              return PostTag.sync({force: true});
            }).then(() => {
              return Promise.join(
                Post.create(),
                Post.create(),
                Post.create(),
                Tag.create({type: 'category'}),
                Tag.create({type: 'category'}),
                Tag.create({type: 'tag'}),
                Tag.create({type: 'tag'})
              );
            }).spread(function(_postA, _postB, _postC, categoryA, categoryB, tagA, tagB) {
              postA = _postA;
              postB = _postB;
              postC = _postC;

              return Promise.join(
                postA.addLinkedData({ model : 'tag', associationAlias : 'categories' }, categoryA),
                postB.setLinkedData({ model : 'tag', associationAlias : 'categories' }, [categoryB]),
                postC.createLinkedData<ItestInstance, ItestAttribute>({ model : 'tag', associationAlias : 'categories' }),
                postA.createLinkedData<ItestInstance, ItestAttribute>({ model : 'tag', associationAlias : 'tags' }),
                postB.addLinkedData({ model : 'tag', associationAlias : 'tags' }, tagA),
                postC.setLinkedData({ model : 'tag', associationAlias : 'tags' }, [tagB])
              );
            }).then(function() {
              return Promise.join(
                postA.getManyLinkedData<ItestInstance, ItestAttribute>({ model : 'tag', associationAlias : 'categories' }),
                postA.getManyLinkedData<ItestInstance, ItestAttribute>({ model : 'tag', associationAlias : 'tags' }),
                postB.getManyLinkedData<ItestInstance, ItestAttribute>({ model : 'tag', associationAlias : 'categories' }),
                postB.getManyLinkedData<ItestInstance, ItestAttribute>({ model : 'tag', associationAlias : 'tags' }),
                postC.getManyLinkedData<ItestInstance, ItestAttribute>({ model : 'tag', associationAlias : 'categories' }),
                postC.getManyLinkedData<ItestInstance, ItestAttribute>({ model : 'tag', associationAlias : 'tags' })
              );
            }).spread((postACategories, postATags, postBCategories, postBTags, postCCategories, postCTags) => {
              expect(postACategories.length).to.equal(1);
              expect(postATags.length).to.equal(1);
              expect(postBCategories.length).to.equal(1);
              expect(postBTags.length).to.equal(1);
              expect(postCCategories.length).to.equal(1);
              expect(postCTags.length).to.equal(1);

              expect(postACategories[0].get('type')).to.equal('category');
              expect(postATags[0].get('type')).to.equal('tag');
              expect(postBCategories[0].get('type')).to.equal('category');
              expect(postBTags[0].get('type')).to.equal('tag');
              expect(postCCategories[0].get('type')).to.equal('category');
              expect(postCTags[0].get('type')).to.equal('tag');
            }).then(() => {
              return Promise.join(
                Post.findOne({
                  where: {
                    id: postA.get('id')
                  },
                  include: [
                    {model: Tag, as: 'tags'},
                    {model: Tag, as: 'categories'},
                  ]
                }),
                Post.findOne({
                  where: {
                    id: postB.get('id')
                  },
                  include: [
                    {model: Tag, as: 'tags'},
                    {model: Tag, as: 'categories'},
                  ]
                }),
                Post.findOne({
                  where: {
                    id: postC.get('id')
                  },
                  include: [
                    {model: Tag, as: 'tags'},
                    {model: Tag, as: 'categories'},
                  ]
                })
              );
            }).spread((_postA, _postB, _postC) => {
              expect(_postA.get('categories').length).to.equal(1);
              expect(_postA.get('tags').length).to.equal(1);
              expect(_postB.get('categories').length).to.equal(1);
              expect(_postB.get('tags').length).to.equal(1);
              expect(_postC.get('categories').length).to.equal(1);
              expect(_postC.get('tags').length).to.equal(1);

              expect(_postA.get('categories')[0].get('type')).to.equal('category');
              expect(_postA.get('tags')[0].get('type')).to.equal('tag');
              expect(_postB.get('categories')[0].get('type')).to.equal('category');
              expect(_postB.get('tags')[0].get('type')).to.equal('tag');
              expect(_postC.get('categories')[0].get('type')).to.equal('category');
              expect(_postC.get('tags')[0].get('type')).to.equal('tag');
            });
          });
        });

        describe('on the through model', () => {
          beforeEach(function() {
            Post = current.define<ItestInstance, ItestAttribute>('post', {});
            Image = current.define<ItestInstance, ItestAttribute>('image', {});
            Question = current.define<ItestInstance, ItestAttribute>('question', {});

            ItemTag = current.define<ItestInstance, ItestAttribute>('item_tag', {
              id: {
                type: new DataTypes.INTEGER(),
                primaryKey: true,
                autoIncrement: true
              },
              tag_id: {
                type: new DataTypes.INTEGER(),
                unique: 'item_tag_taggable'
              },
              taggable: {
                type: new DataTypes.STRING(),
                unique: 'item_tag_taggable'
              },
              taggable_id: {
                type: new DataTypes.INTEGER(),
                unique: 'item_tag_taggable',
                references: null
              }
            });
            Tag = current.define<ItestInstance, ItestAttribute>('tag', {
              name: new DataTypes.STRING()
            });

            Post.belongsToMany(Tag, {
              through: {
                model: ItemTag,
                unique: false,
                scope: {
                  taggable: 'post'
                }
              },
              foreignKey: 'taggable_id',
              constraints: false
            });
            Tag.belongsToMany(Post, {
              through: {
                model: ItemTag,
                unique: false
              },
              foreignKey: 'tag_id'
            });

            Image.belongsToMany(Tag, {
              through: {
                model: ItemTag,
                unique: false,
                scope: {
                  taggable: 'image'
                }
              },
              foreignKey: 'taggable_id',
              constraints: false
            });
            Tag.belongsToMany(Image, {
              through: {
                model: ItemTag,
                unique: false
              },
              foreignKey: 'tag_id'
            });

            Question.belongsToMany(Tag, {
              through: {
                model: ItemTag,
                unique: false,
                scope: {
                  taggable: 'question'
                }
              },
              foreignKey: 'taggable_id',
              constraints: false
            });
            Tag.belongsToMany(Question, {
              through: {
                model: ItemTag,
                unique: false
              },
              foreignKey: 'tag_id'
            });
          });

          it('should create, find and include associations with scope values', function() {
            return Promise.join(
              Post.sync({force: true}),
              Image.sync({force: true}),
              Question.sync({force: true}),
              Tag.sync({force: true})
            ).bind(this).then(function() {
              return ItemTag.sync({force: true});
            }).then(function() {
              return Promise.join(
                Post.create(),
                Image.create(),
                Question.create(),
                Tag.create({name: 'tagA'}),
                Tag.create({name: 'tagB'}),
                Tag.create({name: 'tagC'})
              );
            }).spread(function(_post, _image, _question, tagA, tagB, tagC) {
              post = _post;
              image = _image;
              question = _question;
              return Promise.join(
                post.setLinkedData('tag', [tagA]).then(() => {
                  return Promise.join(
                    post.createLinkedData<ItestInstance, ItestAttribute>('tag', {name: 'postTag'}),
                    post.addLinkedData('tag', tagB)
                  );
                }),
                image.setLinkedData('tag', [tagB]).then(() => {
                  return Promise.join(
                    image.createLinkedData<ItestInstance, ItestAttribute>('tag', {name: 'imageTag'}),
                    image.addLinkedData('tag', tagC)
                  );
                }),
                question.setLinkedData('tag', [tagC]).then(() => {
                  return Promise.join(
                    question.createLinkedData<ItestInstance, ItestAttribute>('tag', {name: 'questionTag'}),
                    question.addLinkedData('tag', tagA)
                  );
                })
              );
            }).then(function() {
              return Promise.join(
                post.getManyLinkedData<ItestInstance, ItestAttribute>('tag'),
                image.getManyLinkedData<ItestInstance, ItestAttribute>('tag'),
                question.getManyLinkedData<ItestInstance, ItestAttribute>('tag')
              ).spread((postTags, imageTags, questionTags) => {
                expect(postTags.length).to.equal(3);
                expect(imageTags.length).to.equal(3);
                expect(questionTags.length).to.equal(3);

                expect(postTags.map(tag => {
                  return tag.name;
                }).sort()).to.deep.equal(['postTag', 'tagA', 'tagB']);

                expect(imageTags.map(tag => {
                  return tag.name;
                }).sort()).to.deep.equal(['imageTag', 'tagB', 'tagC']);

                expect(questionTags.map(tag => {
                  return tag.name;
                }).sort()).to.deep.equal(['questionTag', 'tagA', 'tagC']);
              }).then(() => {
                return Promise.join(
                  Post.findOne({
                    where: {},
                    include: [Tag]
                  }),
                  Image.findOne({
                    where: {},
                    include: [Tag]
                  }),
                  Question.findOne({
                    where: {},
                    include: [Tag]
                  })
                ).spread((_post, _image, _question) => {
                  expect(_post.tags.length).to.equal(3);
                  expect(_image.tags.length).to.equal(3);
                  expect(_question.tags.length).to.equal(3);

                  expect(_post.tags.map(tag => {
                    return tag.name;
                  }).sort()).to.deep.equal(['postTag', 'tagA', 'tagB']);

                  expect(_image.tags.map(tag => {
                    return tag.name;
                  }).sort()).to.deep.equal(['imageTag', 'tagB', 'tagC']);

                  expect(_question.tags.map(tag => {
                    return tag.name;
                  }).sort()).to.deep.equal(['questionTag', 'tagA', 'tagC']);
                });
              });
            });
          });
        });
      });
    }
  });
});
