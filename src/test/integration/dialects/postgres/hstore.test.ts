'use strict';

import * as chai from 'chai';
import { Hstore } from '../../../../lib/dialects/postgres/hstore';
import Support from '../../support';
const dialect = Support.getTestDialect();
const expect = chai.expect;

if (dialect.match(/^postgres/)) {
  describe('[POSTGRES Specific] hstore', () => {
    describe('stringify', () => {
      it('should handle empty objects correctly', () => {
        expect(Hstore.stringify({ })).to.equal('');
      });

      it('should handle null values correctly', () => {
        expect(Hstore.stringify({ null: null })).to.equal('"null"=>NULL');
      });

      it('should handle null values correctly', () => {
        expect(Hstore.stringify({ foo: null })).to.equal('"foo"=>NULL');
      });

      it('should handle empty string correctly', () => {
        expect(Hstore.stringify({foo: ''})).to.equal('"foo"=>\"\"');
      });

      it('should handle a string with backslashes correctly', () => {
        expect(Hstore.stringify({foo: '\\'})).to.equal('"foo"=>"\\\\"');
      });

      it('should handle a string with double quotes correctly', () => {
        expect(Hstore.stringify({foo: '""a"'})).to.equal('"foo"=>"\\"\\"a\\""');
      });

      it('should handle a string with single quotes correctly', () => {
        expect(Hstore.stringify({foo: "''a'"})).to.equal('"foo"=>"\'\'\'\'a\'\'"');
      });

      it('should handle simple objects correctly', () => {
        expect(Hstore.stringify({ test: 'value' })).to.equal('"test"=>"value"');
      });

    });

    describe('parse', () => {
      it('should handle a null object correctly', () => {
        expect(Hstore.parse(null)).to.deep.equal(null);
      });

      it('should handle empty string correctly', () => {
        expect(Hstore.parse('"foo"=>\"\"')).to.deep.equal({foo: ''});
      });

      it('should handle a string with double quotes correctly', () => {
        expect(Hstore.parse('"foo"=>"\\\"\\\"a\\\""')).to.deep.equal({foo: '\"\"a\"'});
      });

      it('should handle a string with single quotes correctly', () => {
        expect(Hstore.parse('"foo"=>"\'\'\'\'a\'\'"')).to.deep.equal({foo: "''a'"});
      });

      it('should handle a string with backslashes correctly', () => {
        expect(Hstore.parse('"foo"=>"\\\\"')).to.deep.equal({foo: '\\'});
      });

      it('should handle empty objects correctly', () => {
        expect(Hstore.parse('')).to.deep.equal({ });
      });

      it('should handle simple objects correctly', () => {
        expect(Hstore.parse('"test"=>"value"')).to.deep.equal({ test: 'value' });
      });

    });
    describe('stringify and parse', () => {
      it('should stringify then parse back the same structure', () => {
        const testObj = {foo: 'bar', count: '1', emptyString: '', quotyString: '""', extraQuotyString: '"""a"""""', backslashes: '\\f023', moreBackslashes: '\\f\\0\\2\\1', backslashesAndQuotes: '\\"\\"uhoh"\\"', nully: null};
        expect(Hstore.parse(Hstore.stringify(testObj))).to.deep.equal(testObj);
        expect(Hstore.parse(Hstore.stringify(Hstore.parse(Hstore.stringify(testObj))))).to.deep.equal(testObj);
      });
    });
  });
}
