'use strict';

import * as chai from 'chai';
import { Model, Sequelize } from '../../../index';
import DataTypes from '../../../lib/data-types';
import { ItestAttribute, ItestInstance } from '../../dummy/dummy-data-set';
import Support from '../support';
const expect = chai.expect;
const Promise = Sequelize.Promise;
const dialect = Support.getTestDialect();
const current = Support.sequelize;

const sortById = function(a, b) {
  return a.id < b.id ? -1 : 1;
};

describe(Support.getTestDialectTeaser('Includes with schemas'), () => {
  let models : {
    [key : string] : Model<ItestInstance, ItestAttribute>;
  };
  describe('findAll', () => {
    beforeEach(function() {
      this.fixtureA = function() {
        return current.dropAllSchemas().then(() => {
          return current.createSchema('account').then(() => {
            const AccUser = current.define<ItestInstance, ItestAttribute>('AccUser', {}, {schema: 'account'});
            const Company = current.define<ItestInstance, ItestAttribute>('Company', {
              name: new DataTypes.STRING()
            }, {schema: 'account'});
            const Product = current.define<ItestInstance, ItestAttribute>('Product', {
              title: new DataTypes.STRING()
            }, {schema: 'account'});
            const Tag = current.define<ItestInstance, ItestAttribute>('Tag', {
              name: new DataTypes.STRING()
            }, {schema: 'account'});
            const Price = current.define<ItestInstance, ItestAttribute>('Price', {
              value: new DataTypes.FLOAT()
            }, {schema: 'account'});
            const Customer = current.define<ItestInstance, ItestAttribute>('Customer', {
              name: new DataTypes.STRING()
            }, {schema: 'account'});
            const Group = current.define<ItestInstance, ItestAttribute>('Group', {
              name: new DataTypes.STRING()
            }, {schema: 'account'});
            const GroupMember = current.define<ItestInstance, ItestAttribute>('GroupMember', {

            }, {schema: 'account'});
            const Rank = current.define<ItestInstance, ItestAttribute>('Rank', {
              name: new DataTypes.STRING(),
              canInvite: {
                type: new DataTypes.INTEGER(),
                defaultValue: 0
              },
              canRemove: {
                type: new DataTypes.INTEGER(),
                defaultValue: 0
              },
              canPost: {
                type: new DataTypes.INTEGER(),
                defaultValue: 0
              }
            }, {schema: 'account'});

            models = {
              AccUser,
              Company,
              Product,
              Tag,
              Price,
              Customer,
              Group,
              GroupMember,
              Rank
            };

            AccUser.hasMany(Product);
            Product.belongsTo(AccUser);

            Product.belongsToMany(Tag, {through: 'product_tag'});
            Tag.belongsToMany(Product, {through: 'product_tag'});
            Product.belongsTo(Tag, {as: 'Category'});
            Product.belongsTo(Company);

            Product.hasMany(Price);
            Price.belongsTo(Product);

            AccUser.hasMany(GroupMember, {as: 'Memberships'});
            GroupMember.belongsTo(AccUser);
            GroupMember.belongsTo(Rank);
            GroupMember.belongsTo(Group);
            Group.hasMany(GroupMember, {as: 'Memberships'});

            return current.sync({force: true}).then(() => {
              return Promise.all([
                Group.bulkCreate([
                  {name: 'Developers'},
                  {name: 'Designers'},
                  {name: 'Managers'},
                ]),
                Company.bulkCreate([
                  {name: 'Sequelize'},
                  {name: 'Coca Cola'},
                  {name: 'Bonanza'},
                  {name: 'NYSE'},
                  {name: 'Coshopr'},
                ]),
                Rank.bulkCreate([
                  {name: 'Admin', canInvite: 1, canRemove: 1, canPost: 1},
                  {name: 'Trustee', canInvite: 1, canRemove: 0, canPost: 1},
                  {name: 'Member', canInvite: 1, canRemove: 0, canPost: 0},
                ]),
                Tag.bulkCreate([
                  {name: 'A'},
                  {name: 'B'},
                  {name: 'C'},
                  {name: 'D'},
                  {name: 'E'},
                ]),
              ]).then(() => {
                return Promise.all([
                  Group.findAll({order : ['id']}),
                  Company.findAll({order : ['id']}),
                  Rank.findAll({order : ['id']}),
                  Tag.findAll({order : ['id']}),
                ]);
              }).spread((groups, companies, ranks, tags) => {
                return Promise.each([0, 1, 2, 3, 4], i => {
                  return Promise.all([
                    AccUser.create(),
                    Product.bulkCreate([
                      {title: 'Chair'},
                      {title: 'Desk'},
                      {title: 'Bed'},
                      {title: 'Pen'},
                      {title: 'Monitor'},
                    ]).then(() => {
                      return Product.findAll({order : ['id']});
                    }),
                  ]).spread((user : ItestInstance, products) => {
                    const groupMembers = [
                      {AccUserId: user.id, GroupId: groups[0].id, RankId: ranks[0].id},
                      {AccUserId: user.id, GroupId: groups[1].id, RankId: ranks[2].id},
                    ];
                    if (i < 3) {
                      groupMembers.push({AccUserId: user.id, GroupId: groups[2].id, RankId: ranks[1].id});
                    }

                    return Promise.join(
                      GroupMember.bulkCreate(groupMembers),
                      user.setLinkedData('Product', [
                        products[i * 5 + 0],
                        products[i * 5 + 1],
                        products[i * 5 + 3],
                      ]) as any,
                      Promise.join(
                        products[i * 5 + 0].setLinkedData('Tag', [
                          tags[0],
                          tags[2],
                        ]),
                        products[i * 5 + 1].setLinkedData('Tag', [
                          tags[1],
                        ]),
                        products[i * 5 + 0].setLinkedData({ model : 'Tag', associationAlias : 'Category' }, tags[1]),
                        products[i * 5 + 2].setLinkedData('Tag', [
                          tags[0],
                        ]),
                        products[i * 5 + 3].setLinkedData('Tag', [
                          tags[0],
                        ])
                      ),
                      Promise.join(
                        products[i * 5 + 0].setLinkedData('Company', companies[4]),
                        products[i * 5 + 1].setLinkedData('Company', companies[3]),
                        products[i * 5 + 2].setLinkedData('Company', companies[2]),
                        products[i * 5 + 3].setLinkedData('Company', companies[1]),
                        products[i * 5 + 4].setLinkedData('Company', companies[0])
                      ),
                      Price.bulkCreate([
                        {ProductId: products[i * 5 + 0].id, value: 5},
                        {ProductId: products[i * 5 + 0].id, value: 10},
                        {ProductId: products[i * 5 + 1].id, value: 5},
                        {ProductId: products[i * 5 + 1].id, value: 10},
                        {ProductId: products[i * 5 + 1].id, value: 15},
                        {ProductId: products[i * 5 + 1].id, value: 20},
                        {ProductId: products[i * 5 + 2].id, value: 20},
                        {ProductId: products[i * 5 + 3].id, value: 20},
                      ])
                    );
                  });
                });
              });
            });
          });
        });
      };
    });

    it('should support an include with multiple different association types', function() {
      return current.dropAllSchemas().then(() => {
        return current.createSchema('account').then(() => {
          const AccUser = current.define<ItestInstance, ItestAttribute>('AccUser', {}, {schema: 'account'});
          const Product = current.define<ItestInstance, ItestAttribute>('Product', {
            title: new DataTypes.STRING()
          }, {schema: 'account'});
          const Tag = current.define<ItestInstance, ItestAttribute>('Tag', {
            name: new DataTypes.STRING()
          }, {schema: 'account'});
          const Price = current.define<ItestInstance, ItestAttribute>('Price', {
            value: new DataTypes.FLOAT()
          }, {schema: 'account'});
          const Group = current.define<ItestInstance, ItestAttribute>('Group', {
            name: new DataTypes.STRING()
          }, {schema: 'account'});
          const GroupMember = current.define<ItestInstance, ItestAttribute>('GroupMember', {

          }, {schema: 'account'});
          const Rank = current.define<ItestInstance, ItestAttribute>('Rank', {
            name: new DataTypes.STRING(),
            canInvite: {
              type: new DataTypes.INTEGER(),
              defaultValue: 0
            },
            canRemove: {
              type: new DataTypes.INTEGER(),
              defaultValue: 0
            }
          }, {schema: 'account'});

          AccUser.hasMany(Product);
          Product.belongsTo(AccUser);

          Product.belongsToMany(Tag, {through: 'product_tag'});
          Tag.belongsToMany(Product, {through: 'product_tag'});
          Product.belongsTo(Tag, {as: 'Category'});

          Product.hasMany(Price);
          Price.belongsTo(Product);

          AccUser.hasMany(GroupMember, {as: 'Memberships'});
          GroupMember.belongsTo(AccUser);
          GroupMember.belongsTo(Rank);
          GroupMember.belongsTo(Group);
          Group.hasMany(GroupMember, {as: 'Memberships'});

          return current.sync({force: true}).then(() => {
            return Promise.all([
              Group.bulkCreate([
                {name: 'Developers'},
                {name: 'Designers'},
              ]).then(() => {
                return Group.findAll();
              }),
              Rank.bulkCreate([
                {name: 'Admin', canInvite: 1, canRemove: 1},
                {name: 'Member', canInvite: 1, canRemove: 0},
              ]).then(() => {
                return Rank.findAll();
              }),
              Tag.bulkCreate([
                {name: 'A'},
                {name: 'B'},
                {name: 'C'},
              ]).then(() => {
                return Tag.findAll();
              }),
            ]).spread((groups, ranks, tags) => {
              return Promise.each([0, 1, 2, 3, 4], i => {
                return Promise.all([
                  AccUser.create(),
                  Product.bulkCreate([
                    {title: 'Chair'},
                    {title: 'Desk'},
                  ]).then(() => {
                    return Product.findAll({order : ['id']});
                  }),
                ]).spread((user : ItestInstance, products) => {
                  return Promise.all([
                    GroupMember.bulkCreate([
                      {AccUserId: user.id, GroupId: groups[0].id, RankId: ranks[0].id},
                      {AccUserId: user.id, GroupId: groups[1].id, RankId: ranks[1].id},
                    ]),
                    user.setLinkedData('Product', [
                      products[i * 2 + 0],
                      products[i * 2 + 1],
                    ]),
                    products[i * 2 + 0].setLinkedData('Tag', [
                      tags[0],
                      tags[2],
                    ]),
                    products[i * 2 + 1].setLinkedData('Tag', [
                      tags[1],
                    ]),
                    products[i * 2 + 0].setLinkedData({ model : 'Tag', associationAlias : 'Category' }, tags[1]),
                    Price.bulkCreate([
                      {ProductId: products[i * 2 + 0].id, value: 5},
                      {ProductId: products[i * 2 + 0].id, value: 10},
                      {ProductId: products[i * 2 + 1].id, value: 5},
                      {ProductId: products[i * 2 + 1].id, value: 10},
                      {ProductId: products[i * 2 + 1].id, value: 15},
                      {ProductId: products[i * 2 + 1].id, value: 20},
                    ]),
                  ]);
                });
              });
            }).then(() => {
              return AccUser.findAll({
                include: [
                  {model: GroupMember, as: 'Memberships', include: [
                    Group,
                    Rank,
                  ]},
                  {model: Product, include: [
                    Tag,
                    {model: Tag, as: 'Category'},
                    Price,
                  ]},
                ],
                order: [
                  [AccUser.rawAttributes.id, 'ASC'],
                ]
              }).then(users => {
                users.forEach(user => {
                  expect(user.Memberships).to.be.ok;
                  user.Memberships.sort(sortById);

                  expect(user.Memberships.length).to.equal(2);
                  expect(user.Memberships[0].Group.name).to.equal('Developers');
                  expect(user.Memberships[0].Rank.canRemove).to.equal(1);
                  expect(user.Memberships[1].Group.name).to.equal('Designers');
                  expect(user.Memberships[1].Rank.canRemove).to.equal(0);

                  user.Products.sort(sortById);
                  expect(user.Products.length).to.equal(2);
                  expect(user.Products[0].Tags.length).to.equal(2);
                  expect(user.Products[1].Tags.length).to.equal(1);
                  expect(user.Products[0].Category).to.be.ok;
                  expect(user.Products[1].Category).not.to.be.ok;

                  expect(user.Products[0].Prices.length).to.equal(2);
                  expect(user.Products[1].Prices.length).to.equal(4);
                });
              });
            });
          });
        });
      });
    });

    it('should support many levels of belongsTo', function() {
      const A = current.define<ItestInstance, ItestAttribute>('a', {}, {schema: 'account'});
      const B = current.define<ItestInstance, ItestAttribute>('b', {}, {schema: 'account'});
      const C = current.define<ItestInstance, ItestAttribute>('c', {}, {schema: 'account'});
      const D = current.define<ItestInstance, ItestAttribute>('d', {}, {schema: 'account'});
      const E = current.define<ItestInstance, ItestAttribute>('e', {}, {schema: 'account'});
      const F = current.define<ItestInstance, ItestAttribute>('f', {}, {schema: 'account'});
      const G = current.define<ItestInstance, ItestAttribute>('g', {}, {schema: 'account'});
      const H = current.define<ItestInstance, ItestAttribute>('h', {}, {schema: 'account'});

      A.belongsTo(B);
      B.belongsTo(C);
      C.belongsTo(D);
      D.belongsTo(E);
      E.belongsTo(F);
      F.belongsTo(G);
      G.belongsTo(H);

      let b;
      const singles = [
        B,
        C,
        D,
        E,
        F,
        G,
        H,
      ];

      return current.sync().then(() => {
        return A.bulkCreate([
          {}, {}, {}, {}, {}, {}, {}, {},
        ]).then(() => {
          let previousInstance : ItestInstance;
          return Promise.each(singles, model => {
            return model.create({}).then(instance => {
              if (previousInstance) {
                return previousInstance.setLinkedData(model, instance).then(() => {
                  previousInstance = instance;
                });
              }
              previousInstance = b = instance;
              return void 0;
            });
          });
        }).then(() => {
          return A.findAll();
        }).then(as => {
          const promises = [];
          as.forEach(a => {
            promises.push(a.setLinkedData('b',  b));
          });
          return Promise.all(promises);
        }).then(() => {
          return A.findAll({
            include: [
              {model: B, include: [
                {model: C, include: [
                  {model: D, include: [
                    {model: E, include: [
                      {model: F, include: [
                        {model: G, include: [
                          {model: H},
                        ]},
                      ]},
                    ]},
                  ]},
                ]},
              ]},
            ]
          }).then(as => {
            expect(as.length).to.be.ok;
            as.forEach(a => {
              expect(a.b.c.d.e.f.g.h).to.be.ok;
            });
          });
        });
      });
    });

    it('should support ordering with only belongsTo includes', function() {
      const User = current.define<ItestInstance, ItestAttribute>('SpecialUser', {}, {schema: 'account'});
      const Item = current.define<ItestInstance, ItestAttribute>('Item', {test: new DataTypes.STRING()}, {schema: 'account'});
      const Order = current.define<ItestInstance, ItestAttribute>('Order', {position: new DataTypes.INTEGER()}, {schema: 'account'});

      User.belongsTo(Item, {as: 'itemA', foreignKey: 'itemA_id'});
      User.belongsTo(Item, {as: 'itemB', foreignKey: 'itemB_id'});
      User.belongsTo(Order);

      return current.sync().then(() => {
        return Promise.all([
          User.bulkCreate([{}, {}, {}]),
          Item.bulkCreate([
            {test: 'abc'},
            {test: 'def'},
            {test: 'ghi'},
            {test: 'jkl'},
          ]),
          Order.bulkCreate([
            {position: 2},
            {position: 3},
            {position: 1},
          ]),
        ]).then(() => {
          return Promise.all([
            User.findAll(),
            Item.findAll({order: ['id']}),
            Order.findAll({order: ['id']}),
          ]);
        }).spread((users, items, orders) => {
          return Promise.all([
            users[0].setLinkedData({ model : 'Item', associationAlias : 'itemA' }, items[0]),
            users[0].setLinkedData({ model : 'Item', associationAlias : 'itemB' }, items[1]),
            users[0].setLinkedData('Order', orders[2]),
            users[1].setLinkedData({ model : 'Item', associationAlias : 'itemA' }, items[2]),
            users[1].setLinkedData({ model : 'Item', associationAlias : 'itemB' }, items[3]),
            users[1].setLinkedData('Order', orders[1]),
            users[2].setLinkedData({ model : 'Item', associationAlias : 'itemA' }, items[0]),
            users[2].setLinkedData({ model : 'Item', associationAlias : 'itemB' }, items[3]),
            users[2].setLinkedData('Order', orders[0]),
          ]);
        }).spread(() => {
          return User.findAll({
            include: [
              {model: Item, as: 'itemA', where: {test: 'abc'}},
              {model: Item, as: 'itemB'},
              Order],
            order: [
              [Order, 'position'],
            ]
          }).then(as => {
            expect(as.length).to.eql(2);
            expect(as[0].itemA.test).to.eql('abc');
            expect(as[1].itemA.test).to.eql('abc');
            expect(as[0].Order.position).to.eql(1);
            expect(as[1].Order.position).to.eql(2);
          });
        });
      });
    });


    it('should include attributes from through models', function() {
      const Product = current.define<ItestInstance, ItestAttribute>('Product', {
        title: new DataTypes.STRING()
      }, {schema: 'account'});
      const Tag = current.define<ItestInstance, ItestAttribute>('Tag', {
        name: new DataTypes.STRING()
      }, {schema: 'account'});
      const ProductTag = current.define<ItestInstance, ItestAttribute>('ProductTag', {
        priority: new DataTypes.INTEGER()
      }, {schema: 'account'});

      Product.belongsToMany(Tag, {through: ProductTag});
      Tag.belongsToMany(Product, {through: ProductTag});

      return current.sync({force: true}).then(() => {
        return Promise.all([
          Product.bulkCreate([
            {title: 'Chair'},
            {title: 'Desk'},
            {title: 'Dress'},
          ]),
          Tag.bulkCreate([
            {name: 'A'},
            {name: 'B'},
            {name: 'C'},
          ]),
        ]).spread(() => {
          return Promise.all([
            Product.findAll(),
            Tag.findAll(),
          ]);
        }).spread((products, tags) => {
          return Promise.all([
            products[0].addLinkedData('Tag', tags[0], { through: {priority: 1}}),
            products[0].addLinkedData('Tag', tags[1], { through: {priority: 2}}),
            products[1].addLinkedData('Tag', tags[1], { through: {priority: 1}}),
            products[2].addLinkedData('Tag', tags[0], { through: {priority: 3}}),
            products[2].addLinkedData('Tag', tags[1], { through: {priority: 1}}),
            products[2].addLinkedData('Tag', tags[2], { through: {priority: 2}}),
          ]);
        }).spread(() => {
          return Product.findAll({
            include: [
              {model: Tag},
            ],
            order: [
              ['id', 'ASC'],
              [Tag, 'id', 'ASC'],
            ]
          }).then(products => {
            expect(products[0].Tags[0].ProductTag.priority).to.equal(1);
            expect(products[0].Tags[1].ProductTag.priority).to.equal(2);
            expect(products[1].Tags[0].ProductTag.priority).to.equal(1);
            expect(products[2].Tags[0].ProductTag.priority).to.equal(3);
            expect(products[2].Tags[1].ProductTag.priority).to.equal(1);
            expect(products[2].Tags[2].ProductTag.priority).to.equal(2);
          });
        });
      });
    });

    it('should support a required belongsTo include', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {}, {schema: 'account'});
      const Group = current.define<ItestInstance, ItestAttribute>('Group', {}, {schema: 'account'});

      User.belongsTo(Group);

      return current.sync({force: true}).then(() => {
        return Promise.all([
          Group.bulkCreate([{}, {}]),
          User.bulkCreate([{}, {}, {}]),
        ]).then(() => {
          return Promise.all([
            Group.findAll(),
            User.findAll(),
          ]);
        }).spread((groups, users) => {
          return users[2].setLinkedData('Group', groups[1]);
        }).then(() => {
          return User.findAll({
            include: [
              {model: Group, required: true},
            ]
          }).then(users => {
            expect(users.length).to.equal(1);
            expect(users[0].Group).to.be.ok;
          });
        });
      });
    });

    it('should be possible to extend the on clause with a where option on a belongsTo include', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {}, {schema: 'account'});
      const Group = current.define<ItestInstance, ItestAttribute>('Group', {
        name: new DataTypes.STRING()
      }, {schema: 'account'});

      User.belongsTo(Group);

      return current.sync({force: true}).then(() => {
        return Promise.all([
          Group.bulkCreate([
            {name: 'A'},
            {name: 'B'},
          ]),
          User.bulkCreate([{}, {}]),
        ]).then(() => {
          return Promise.all([
            Group.findAll(),
            User.findAll(),
          ]);
        }).spread((groups, users) => {
          return Promise.all([
            users[0].setLinkedData('Group', groups[1]),
            users[1].setLinkedData('Group', groups[0]),
          ]);
        }).then(() => {
          return User.findAll({
            include: [
              {model: Group, where: {name: 'A'}},
            ]
          }).then(users => {
            expect(users.length).to.equal(1);
            expect(users[0].Group).to.be.ok;
            expect(users[0].Group.name).to.equal('A');
          });
        });
      });
    });

    it('should be possible to extend the on clause with a where option on a belongsTo include', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {}, {schema: 'account'});
      const Group = current.define<ItestInstance, ItestAttribute>('Group', {
        name: new DataTypes.STRING()
      }, {schema: 'account'});

      User.belongsTo(Group);

      return current.sync({force: true}).then(() => {
        return Promise.all([
          Group.bulkCreate([
            {name: 'A'},
            {name: 'B'},
          ]),
          User.bulkCreate([{}, {}]),
        ]).then(() => {
          return Promise.all([
            Group.findAll(),
            User.findAll(),
          ]);
        }).spread((groups, users) => {
          return Promise.all([
            users[0].setLinkedData('Group', groups[1]),
            users[1].setLinkedData('Group', groups[0]),
          ]);
        }).then(() => {
          return User.findAll({
            include: [
              {model: Group, required: true},
            ]
          }).then(users => {
            users.forEach(user => {
              expect(user.Group).to.be.ok;
            });
          });
        });
      });
    });

    it('should be possible to define a belongsTo include as required with child hasMany with limit', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {}, {schema: 'account'});
      const Group = current.define<ItestInstance, ItestAttribute>('Group', {
        name: new DataTypes.STRING()
      }, {schema: 'account'});
      const Category = current.define<ItestInstance, ItestAttribute>('Category', {
        category: new DataTypes.STRING()
      }, {schema: 'account'});

      User.belongsTo(Group);
      Group.hasMany(Category);

      return current.sync({force: true}).then(() => {
        return Promise.all([
          Group.bulkCreate([
            {name: 'A'},
            {name: 'B'},
          ]),
          User.bulkCreate([{}, {}]),
          Category.bulkCreate([{}, {}]),
        ]).then(() => {
          return Promise.all([
            Group.findAll(),
            User.findAll(),
            Category.findAll(),
          ]);
        }).spread((groups, users, categories) => {
          const promises = [
            users[0].setLinkedData('Group', groups[1]),
            users[1].setLinkedData('Group', groups[0]),
          ];
          groups.forEach(group => {
            promises.push(group.setLinkedData('Category', categories));
          });
          return Promise.all(promises);
        }).then(() => {
          return User.findAll({
            include: [
              {model: Group, required: true, include: [
                {model: Category},
              ]},
            ],
            limit: 1
          }).then(users => {
            expect(users.length).to.equal(1);
            users.forEach(user => {
              expect(user.Group).to.be.ok;
              expect(user.Group.Categories).to.be.ok;
            });
          });
        });
      });
    });

    it('should be possible to define a belongsTo include as required with child hasMany with limit and aliases', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {}, {schema: 'account'});
      const Group = current.define<ItestInstance, ItestAttribute>('Group', {
        name: new DataTypes.STRING()
      }, {schema: 'account'});
      const Category = current.define<ItestInstance, ItestAttribute>('Category', {
        category: new DataTypes.STRING()
      }, {schema: 'account'});

      User.belongsTo(Group, {as: 'Team'});
      Group.hasMany(Category, {as: 'Tags'});

      return current.sync({force: true}).then(() => {
        return Promise.all([
          Group.bulkCreate([
            {name: 'A'},
            {name: 'B'},
          ]),
          User.bulkCreate([{}, {}]),
          Category.bulkCreate([{}, {}]),
        ]).then(() => {
          return Promise.all([
            Group.findAll(),
            User.findAll(),
            Category.findAll(),
          ]);
        }).spread((groups, users, categories) => {
          const promises = [
            users[0].setLinkedData({ model : 'Group', associationAlias : 'Team' }, groups[1]),
            users[1].setLinkedData({ model : 'Group', associationAlias : 'Team' }, groups[0]),
          ];
          groups.forEach(group => {
            promises.push(group.setLinkedData({ model : 'Category', associationAlias : 'Tags' }, categories));
          });
          return Promise.all(promises);
        }).then(() => {
          return User.findAll({
            include: [
              {model: Group, required: true, as: 'Team', include: [
                {model: Category, as: 'Tags'},
              ]},
            ],
            limit: 1
          }).then(users => {
            expect(users.length).to.equal(1);
            users.forEach(user => {
              expect(user.Team).to.be.ok;
              expect(user.Team.Tags).to.be.ok;
            });
          });
        });
      });
    });

    it('should be possible to define a belongsTo include as required with child hasMany which is not required with limit', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {}, {schema: 'account'});
      const Group = current.define<ItestInstance, ItestAttribute>('Group', {
        name: new DataTypes.STRING()
      }, {schema: 'account'});
      const Category = current.define<ItestInstance, ItestAttribute>('Category', {
        category: new DataTypes.STRING()
      }, {schema: 'account'});

      User.belongsTo(Group);
      Group.hasMany(Category);

      return current.sync({force: true}).then(() => {
        return Promise.all([
          Group.bulkCreate([
            {name: 'A'},
            {name: 'B'},
          ]),
          User.bulkCreate([{}, {}]),
          Category.bulkCreate([{}, {}]),
        ]).then(() => {
          return Promise.all([
            Group.findAll(),
            User.findAll(),
            Category.findAll(),
          ]);
        }).spread((groups, users, categories) => {
          const promises = [
            users[0].setLinkedData('Group', groups[1]),
            users[1].setLinkedData('Group', groups[0]),
          ];
          groups.forEach(group => {
            promises.push(group.setLinkedData('Category', categories));
          });
          return Promise.all(promises);
        }).then(() => {
          return User.findAll({
            include: [
              {model: Group, required: true, include: [
                {model: Category, required: false},
              ]},
            ],
            limit: 1
          }).then(users => {
            expect(users.length).to.equal(1);
            users.forEach(user => {
              expect(user.Group).to.be.ok;
              expect(user.Group.Categories).to.be.ok;
            });
          });
        });
      });
    });

    it('should be possible to extend the on clause with a where option on a hasOne include', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {}, {schema: 'account'});
      const Project = current.define<ItestInstance, ItestAttribute>('Project', {
        title: new DataTypes.STRING()
      }, {schema: 'account'});

      User.hasOne(Project, {as: 'LeaderOf'});

      return current.sync({force: true}).then(() => {
        return Promise.all([
          Project.bulkCreate([
            {title: 'Alpha'},
            {title: 'Beta'},
          ]),
          User.bulkCreate([{}, {}]),
        ]).then(() => {
          return Promise.all([
            Project.findAll(),
            User.findAll(),
          ]);
        }).spread((projects, users) => {
          return Promise.all([
            users[1].setLinkedData({ model : 'Project', associationAlias : 'LeaderOf' }, projects[1]),
            users[0].setLinkedData({ model : 'Project', associationAlias : 'LeaderOf' }, projects[0]),
          ]);
        }).then(() => {
          return User.findAll({
            include: [
              {model: Project, as: 'LeaderOf', where: {title: 'Beta'}},
            ]
          }).then(users => {
            expect(users.length).to.equal(1);
            expect(users[0].LeaderOf).to.be.ok;
            expect(users[0].LeaderOf.title).to.equal('Beta');
          });
        });
      });
    });

    it('should be possible to extend the on clause with a where option on a hasMany include with a through model', function() {
      const Product = current.define<ItestInstance, ItestAttribute>('Product', {
        title: new DataTypes.STRING()
      }, {schema: 'account'});
      const Tag = current.define<ItestInstance, ItestAttribute>('Tag', {
        name: new DataTypes.STRING()
      }, {schema: 'account'});
      const ProductTag = current.define<ItestInstance, ItestAttribute>('ProductTag', {
        priority: new DataTypes.INTEGER()
      }, {schema: 'account'});

      Product.belongsToMany(Tag, {through: ProductTag});
      Tag.belongsToMany(Product, {through: ProductTag});

      return current.sync({force: true}).then(() => {
        return Promise.all([
          Product.bulkCreate([
            {title: 'Chair'},
            {title: 'Desk'},
            {title: 'Dress'},
          ]),
          Tag.bulkCreate([
            {name: 'A'},
            {name: 'B'},
            {name: 'C'},
          ]),
        ]).then(() => {
          return Promise.all([
            Product.findAll(),
            Tag.findAll(),
          ]);
        }).spread((products, tags) => {
          return Promise.all([
            products[0].addLinkedData('Tag', tags[0], {priority: 1}),
            products[0].addLinkedData('Tag', tags[1], {priority: 2}),
            products[1].addLinkedData('Tag', tags[1], {priority: 1}),
            products[2].addLinkedData('Tag', tags[0], {priority: 3}),
            products[2].addLinkedData('Tag', tags[1], {priority: 1}),
            products[2].addLinkedData('Tag', tags[2], {priority: 2}),
          ]);
        }).then(() => {
          return Product.findAll({
            include: [
              {model: Tag, where: {name: 'C'}},
            ]
          }).then(products => {
            expect(products.length).to.equal(1);
            expect(products[0].Tags.length).to.equal(1);
          });
        });
      });
    });

    it('should be possible to extend the on clause with a where option on nested includes', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {
        name: new DataTypes.STRING()
      }, {schema: 'account'});
      const Product = current.define<ItestInstance, ItestAttribute>('Product', {
        title: new DataTypes.STRING()
      }, {schema: 'account'});
      const Tag = current.define<ItestInstance, ItestAttribute>('Tag', {
        name: new DataTypes.STRING()
      }, {schema: 'account'});
      const Price = current.define<ItestInstance, ItestAttribute>('Price', {
        value: new DataTypes.FLOAT()
      }, {schema: 'account'});
      const Group = current.define<ItestInstance, ItestAttribute>('Group', {
        name: new DataTypes.STRING()
      }, {schema: 'account'});
      const GroupMember = current.define<ItestInstance, ItestAttribute>('GroupMember', {

      }, {schema: 'account'});
      const Rank = current.define<ItestInstance, ItestAttribute>('Rank', {
        name: new DataTypes.STRING(),
        canInvite: {
          type: new DataTypes.INTEGER(),
          defaultValue: 0
        },
        canRemove: {
          type: new DataTypes.INTEGER(),
          defaultValue: 0
        }
      }, {schema: 'account'});

      User.hasMany(Product);
      Product.belongsTo(User);

      Product.belongsToMany(Tag, {through: 'product_tag'});
      Tag.belongsToMany(Product, {through: 'product_tag'});
      Product.belongsTo(Tag, {as: 'Category'});

      Product.hasMany(Price);
      Price.belongsTo(Product);

      User.hasMany(GroupMember, {as: 'Memberships'});
      GroupMember.belongsTo(User);
      GroupMember.belongsTo(Rank);
      GroupMember.belongsTo(Group);
      Group.hasMany(GroupMember, {as: 'Memberships'});

      return current.sync({force: true}).then(() => {
        return Promise.all([
          Group.bulkCreate([
            {name: 'Developers'},
            {name: 'Designers'},
          ]),
          Rank.bulkCreate([
            {name: 'Admin', canInvite: 1, canRemove: 1},
            {name: 'Member', canInvite: 1, canRemove: 0},
          ]),
          Tag.bulkCreate([
            {name: 'A'},
            {name: 'B'},
            {name: 'C'},
          ]),
        ]).then(() => {
          return Promise.all([
            Group.findAll({order  : ['id']}),
            Rank.findAll({order  : ['id']}),
            Tag.findAll({order  : ['id']}),
          ]);
        }).spread((groups, ranks, tags) => {
          return Promise.resolve([0, 1, 2, 3, 4]).each(i => {
            return Promise.all([
              User.create({name: 'FooBarzz'}),
              Product.bulkCreate([
                {title: 'Chair'},
                {title: 'Desk'},
              ]).then(() => {
                return Product.findAll({order  : ['id']});
              }),
            ]).spread((user : ItestInstance, products) => {
              return Promise.all([
                GroupMember.bulkCreate([
                  {UserId: user.id, GroupId: groups[0].id, RankId: ranks[0].id},
                  {UserId: user.id, GroupId: groups[1].id, RankId: ranks[1].id},
                ]),
                user.setLinkedData('Product', [
                  products[i * 2 + 0],
                  products[i * 2 + 1],
                ]),
                products[i * 2 + 0].setLinkedData('Tag', [
                  tags[0],
                  tags[2],
                ]),
                products[i * 2 + 1].setLinkedData('Tag', [
                  tags[1],
                ]),
                products[i * 2 + 0].setLinkedData({ model : 'Tag', associationAlias : 'Category' }, tags[1]),
                Price.bulkCreate([
                  {ProductId: products[i * 2 + 0].id, value: 5},
                  {ProductId: products[i * 2 + 0].id, value: 10},
                  {ProductId: products[i * 2 + 1].id, value: 5},
                  {ProductId: products[i * 2 + 1].id, value: 10},
                  {ProductId: products[i * 2 + 1].id, value: 15},
                  {ProductId: products[i * 2 + 1].id, value: 20},
                ]),
              ]);
            });
          });
        }).then(() => {
          return User.findAll({
            include: [
              {model: GroupMember, as: 'Memberships', include: [
                Group,
                {model: Rank, where: {name: 'Admin'}},
              ]},
              {model: Product, include: [
                Tag,
                {model: Tag, as: 'Category'},
                {model: Price, where: {
                  value: {
                    gt: 15
                  }
                }},
              ]},
            ],
            order: [
              ['id', 'ASC'],
            ]
          }).then(users => {
            users.forEach(user => {
              expect(user.Memberships.length).to.equal(1);
              expect(user.Memberships[0].Rank.name).to.equal('Admin');
              expect(user.Products.length).to.equal(1);
              expect(user.Products[0].Prices.length).to.equal(1);
            });
          });
        });
      });
    });

    it('should be possible to use limit and a where with a belongsTo include', function() {
      const User = current.define<ItestInstance, ItestAttribute>('User', {}, {schema: 'account'});
      const Group = current.define<ItestInstance, ItestAttribute>('Group', {
        name: new DataTypes.STRING()
      }, {schema: 'account'});

      User.belongsTo(Group);

      return current.sync({force: true}).then(() => {
        return Promise.props({
          groups: Group.bulkCreate([
            {name: 'A'},
            {name: 'B'},
          ]).then(() => {
            return Group.findAll();
          }),
          users: User.bulkCreate([{}, {}, {}, {}]).then(() => {
            return User.findAll();
          })
        }).then(results => {
          return Promise.join(
            results.users[1].setLinkedData('Group', results.groups[0]),
            results.users[2].setLinkedData('Group', results.groups[0]),
            results.users[3].setLinkedData('Group', results.groups[1]),
            results.users[0].setLinkedData('Group', results.groups[0])
          );
        }).then(() => {
          return User.findAll({
            include: [
              {model: Group, where: {name: 'A'}},
            ],
            limit: 2
          }).then(users => {
            expect(users.length).to.equal(2);

            users.forEach(user => {
              expect(user.Group.name).to.equal('A');
            });
          });
        });
      });
    });

    it('should be possible use limit, attributes and a where on a belongsTo with additional hasMany includes', function() {
      return this.fixtureA().then(() => {
        return models.Product.findAll({
          attributes: ['title'],
          include: [
            {model: models.Company, where: {name: 'NYSE'}},
            {model: models.Tag},
            {model: models.Price},
          ],
          limit: 3,
          order: [
            [current.col(models.Product.name + '.title'), 'ASC'],
          ]
        }).then(products => {
          expect(products.length).to.equal(3);

          products.forEach(product => {
            expect(product.Company.name).to.equal('NYSE');
            expect(product.Tags.length).to.be.ok;
            expect(product.Prices.length).to.be.ok;
          });
        });
      });
    });

    it('should be possible to use limit and a where on a hasMany with additional includes', function() {
      return this.fixtureA().then(() => {
        return models.Product.findAll({
          include: [
            {model: models.Company},
            {model: models.Tag},
            {model: models.Price, where: {
              value: {gt: 5}
            }},
          ],
          limit: 6,
          order: [
            ['id'],
          ]
        }).then(products => {
          expect(products.length).to.equal(6);

          products.forEach(product => {
            expect(product.Tags.length).to.be.ok;
            expect(product.Prices.length).to.be.ok;

            product.Prices.forEach(price => {
              expect(price.value).to.be.above(5);
            });
          });
        });
      });
    });

    it('should be possible to use limit and a where on a hasMany with a through model with additional includes', function() {
      return this.fixtureA().then(() => {
        return models.Product.findAll({
          include: [
            {model: models.Company},
            {model: models.Tag, where: {name: ['A', 'B', 'C']}},
            {model: models.Price},
          ],
          limit: 10,
          order: [
            ['id'],
          ]
        }).then(products => {
          expect(products.length).to.equal(10);

          products.forEach(product => {
            expect(product.Tags.length).to.be.ok;
            expect(product.Prices.length).to.be.ok;

            product.Tags.forEach(tag => {
              expect(['A', 'B', 'C']).to.include(tag.name);
            });
          });
        });
      });
    });

    it('should support including date fields, with the correct timeszone', function() {
      const User = current.define<ItestInstance, ItestAttribute>('user', {
        dateField: new DataTypes.DATE()
      }, {timestamps: false, schema: 'account'});
      const Group = current.define<ItestInstance, ItestAttribute>('group', {
        dateField: new DataTypes.DATE()
      }, {timestamps: false, schema: 'account'});

      User.belongsToMany(Group, {through: 'group_user'});
      Group.belongsToMany(User, {through: 'group_user'});

      return current.sync().then(() => {
        return User.create({ dateField: Date.UTC(2014, 1, 20) }).then(user => {
          return Group.create({ dateField: Date.UTC(2014, 1, 20) }).then(group => {
            return user.addLinkedData('group', group).then(() => {
              return User.findAll({
                where: {
                  id: user.id
                },
                include: [Group]
              }).then(users => {
                if (dialect === 'sqlite') {
                  expect(new Date(users[0].dateField).getTime()).to.equal(Date.UTC(2014, 1, 20));
                  expect(new Date(users[0].groups[0].dateField).getTime()).to.equal(Date.UTC(2014, 1, 20));
                } else {
                  expect(users[0].dateField.getTime()).to.equal(Date.UTC(2014, 1, 20));
                  expect(users[0].groups[0].dateField.getTime()).to.equal(Date.UTC(2014, 1, 20));
                }
              });
            });
          });
        });
      });
    });

  });

  describe('findOne', () => {
    it('should work with schemas', function() {
      const UserModel = current.define<ItestInstance, ItestAttribute>('User', {
        Id: {
          type: new DataTypes.INTEGER(),
          primaryKey: true
        },
        Name: new DataTypes.STRING(),
        UserType: new DataTypes.INTEGER(),
        Email: new DataTypes.STRING(),
        PasswordHash: new DataTypes.STRING(),
        Enabled: {
          type: new DataTypes.BOOLEAN()
        },
        CreatedDatetime: new DataTypes.DATE(),
        UpdatedDatetime: new DataTypes.DATE()
      }, {
        schema: 'hero',
        tableName: 'User',
        timestamps: false
      });

      const UserIdColumn = { type: new DataTypes.INTEGER(), references: { model: UserModel, key: 'Id' } };

      const ResumeModel = current.define<ItestInstance, ItestAttribute>('Resume', {
        Id: {
          type: new DataTypes.INTEGER(),
          primaryKey: true
        },
        UserId: UserIdColumn,
        Name: new DataTypes.STRING(),
        Contact: new DataTypes.STRING(),
        School: new DataTypes.STRING(),
        WorkingAge: new DataTypes.STRING(),
        Description: new DataTypes.STRING(),
        PostType: new DataTypes.INTEGER(),
        RefreshDatetime: new DataTypes.DATE(),
        CreatedDatetime: new DataTypes.DATE()
      }, {
        schema: 'hero',
        tableName: 'resume',
        timestamps: false
      });

      UserModel.hasOne(ResumeModel, {
        foreignKey: 'UserId',
        as: 'Resume'
      });

      ResumeModel.belongsTo(UserModel, {
        foreignKey: 'UserId'
      });

      return current.dropAllSchemas().then(() => {
        return current.createSchema('hero');
      }).then(() => {
        return current.sync({force: true}).then(() => {
          return UserModel.find({
            where: {
              Id: 1
            },
            include: [{
              model: ResumeModel,
              as: 'Resume'
            }]
          });
        });
      });
    });
  });
});
