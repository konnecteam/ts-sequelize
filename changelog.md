# Change Log

## ts-sequelize

- All requires were replaced by import
- All data types became class
- Everything has become class, 
- Each dialect now override abstract dialect classes
- QueryTypes and TableHints became enum
- _groupJoinData was refactored and commented for an easier comprehension and debug
- Added GlobalOptions singleton, to allow access of some options in all files
- Added dialect option noTimezone for MSSQL and Oracle which is used to disable timezone for DATE  
- Added all attributes that options parameter can take in each function
- Added types and comment for parameters of each function to simplify usage
- Refactoring tests
- Added comments for some functions
- Added include and config interfaces for Sequelize and Model options
- Using Typedoc for API documentation generation
- Using mkdocs for documentation generation
