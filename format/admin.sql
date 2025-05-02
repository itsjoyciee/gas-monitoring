/*
Navicat MySQL Data Transfer

Source Server         : database
Source Server Version : 50616
Source Host           : localhost:3306
Source Database       : barangay

Target Server Type    : MYSQL
Target Server Version : 50616
File Encoding         : 65001

Date: 2021-07-19 08:16:15
*/

SET FOREIGN_KEY_CHECKS=0;

-- ----------------------------
-- Table structure for admin
-- ----------------------------
DROP TABLE IF EXISTS `admin`;
CREATE TABLE `admin` (
  `id` int(11) NOT NULL,
  `username` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `verify` varchar(255) DEFAULT NULL,
  `report` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- ----------------------------
-- Records of admin
-- ----------------------------
INSERT INTO `admin` VALUES ('1', 'admin', 'admin', '1', '1', 'Administartor');
