const EmployeeRegistration = artifacts.require("EmployeeRegistration");

module.exports = function(deployer) {
  deployer.deploy(EmployeeRegistration);
};
