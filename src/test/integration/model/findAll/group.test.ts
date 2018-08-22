'use strict';

import * as chai from 'chai';
import DataTypes from '../../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../../dummy/dummy-data-set';
import Support from '../../support';
const expect = chai.expect;
const Sequelize = Support.Sequelize;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser('Model'), () => {
  describe('findAll', () => {
    describe('group', () => {
      it('should correctly group with attributes, #3009', () => {

        const Post = current.define<ItestInstance, ItestAttribute>('Post', {
          id: { type: new DataTypes.INTEGER(), autoIncrement: true, primaryKey: true },
          name: { type: new DataTypes.STRING(), allowNull: false }
        });

        const Comment = current.define<ItestInstance, ItestAttribute>('Comment', {
          id: { type: new DataTypes.INTEGER(), autoIncrement: true, primaryKey: true },
          text: { type: new DataTypes.STRING(), allowNull: false }
        });

        Post.hasMany(Comment);

        return current.sync({ force: true }).then(() => {
          // Create an enviroment
          return Post.bulkCreate([
            { name: 'post-1' },
            { name: 'post-2' },
          ]);
        }).then(() => {
          return Comment.bulkCreate([
            { text: 'Market', PostId: 1},
            { text: 'Text', PostId: 2},
            { text: 'Abc', PostId: 2},
            { text: 'Semaphor', PostId: 1},
            { text: 'Text', PostId: 1},
          ]);
        }).then(() => {
          return Post.findAll({
            attributes: [[Sequelize.fn('COUNT', Sequelize.col('Comments.id')), 'comment_count']],
            include: [
              { model: Comment, attributes: [] },
            ],
            group: ['Post.id']
          });
        }).then(posts => {
          expect(parseInt(posts[0].get('comment_count'), 10)).to.be.equal(3);
          expect(parseInt(posts[1].get('comment_count'), 10)).to.be.equal(2);
        });
      });

      it('should not add primary key when grouping using a belongsTo association', () => {
        const Post = current.define<ItestInstance, ItestAttribute>('Post', {
          id: { type: new DataTypes.INTEGER(), autoIncrement: true, primaryKey: true },
          name: { type: new DataTypes.STRING(), allowNull: false }
        });

        const Comment = current.define<ItestInstance, ItestAttribute>('Comment', {
          id: { type: new DataTypes.INTEGER(), autoIncrement: true, primaryKey: true },
          text: { type: new DataTypes.STRING(), allowNull: false }
        });

        Post.hasMany(Comment);
        Comment.belongsTo(Post);

        return current.sync({ force: true }).then(() => {
          return Post.bulkCreate([
            { name: 'post-1' },
            { name: 'post-2' },
          ]);
        }).then(() => {
          return Comment.bulkCreate([
            { text: 'Market', PostId: 1 },
            { text: 'Text', PostId: 2 },
            { text: 'Abc', PostId: 2 },
            { text: 'Semaphor', PostId: 1 },
            { text: 'Text', PostId: 1 },
          ]);
        }).then(() => {
          return Comment.findAll({
            attributes: ['PostId', [Sequelize.fn('COUNT', Sequelize.col('Comment.id')), 'comment_count']],
            include: [
              { model: Post, attributes: [] },
            ],
            group: ['PostId']
          });
        }).then(posts => {
          expect(posts[0].get().hasOwnProperty('id')).to.equal(false);
          expect(posts[1].get().hasOwnProperty('id')).to.equal(false);
          expect(parseInt(posts[0].get('comment_count'), 10)).to.be.equal(3);
          expect(parseInt(posts[1].get('comment_count'), 10)).to.be.equal(2);
        });
      });
    });
  });
});
