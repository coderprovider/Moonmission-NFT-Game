// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "./Game.sol";
import "./WSDM.sol";

contract Staking {

	uint256 constant private FLOAT_SCALAR = 2**64;

	struct User {
		uint256 deposited;
		int256 scaledPayout;
	}

	struct Info {
		uint256 totalDeposited;
		uint256 scaledRewardsPerToken;
		uint256 pendingRewards;
		mapping(address => User) users;
		Game g;
		WSDM wsdm;
		Pair pair;
	}
	Info private info;


	event Deposit(address indexed user, uint256 amount);
	event Withdraw(address indexed user, uint256 amount);
	event Claim(address indexed user, uint256 amount);
	event Reward(uint256 amount);


	constructor(Game _g, Pair _pair) {
		info.g = _g;
		info.wsdm = WSDM(msg.sender);
		info.pair = _pair;
	}

	function disburse(uint256 _amount) external {
		if (_amount > 0) {
			info.wsdm.transferFrom(msg.sender, address(this), _amount);
			_disburse(_amount);
		}
	}

	function deposit(uint256 _amount) external {
		depositFor(_amount, msg.sender);
	}

	function depositFor(uint256 _amount, address _user) public {
		require(_amount > 0);
		_update();
		info.pair.transferFrom(msg.sender, address(this), _amount);
		info.totalDeposited += _amount;
		info.users[_user].deposited += _amount;
		info.users[_user].scaledPayout += int256(_amount * info.scaledRewardsPerToken);
		emit Deposit(_user, _amount);
	}

	function withdrawAll() external {
		uint256 _deposited = depositedOf(msg.sender);
		if (_deposited > 0) {
			withdraw(_deposited);
		}
	}

	function withdraw(uint256 _amount) public {
		require(_amount > 0 && _amount <= depositedOf(msg.sender));
		_update();
		info.totalDeposited -= _amount;
		info.users[msg.sender].deposited -= _amount;
		info.users[msg.sender].scaledPayout -= int256(_amount * info.scaledRewardsPerToken);
		info.pair.transfer(msg.sender, _amount);
		emit Withdraw(msg.sender, _amount);
	}

	function claim() external {
		_update();
		uint256 _rewards = rewardsOf(msg.sender);
		if (_rewards > 0) {
			info.users[msg.sender].scaledPayout += int256(_rewards * FLOAT_SCALAR);
			info.wsdm.transfer(msg.sender, _rewards);
			emit Claim(msg.sender, _rewards);
		}
	}

	
	function totalDeposited() public view returns (uint256) {
		return info.totalDeposited;
	}

	function depositedOf(address _user) public view returns (uint256) {
		return info.users[_user].deposited;
	}
	
	function rewardsOf(address _user) public view returns (uint256) {
		return uint256(int256(info.scaledRewardsPerToken * depositedOf(_user)) - info.users[_user].scaledPayout) / FLOAT_SCALAR;
	}

	function allInfoFor(address _user) external view returns (uint256 totalLPDeposited, uint256 totalLPTokens, uint256 wethReserve, uint256 wsdmReserve, uint256 userBalance, uint256 userAllowance, uint256 userDeposited, uint256 userRewards) {
		totalLPDeposited = totalDeposited();
		( , totalLPTokens, wethReserve, wsdmReserve, , , ) = info.wsdm.allInfoFor(address(this));
		userBalance = info.pair.balanceOf(_user);
		userAllowance = info.pair.allowance(_user, address(this));
		userDeposited = depositedOf(_user);
		userRewards = rewardsOf(_user);
	}

	function _update() internal {
		address _this = address(this);
		uint256 _balanceBefore = info.wsdm.balanceOf(_this);
		info.g.claim();
		_disburse(info.wsdm.balanceOf(_this) - _balanceBefore);
	}

	function _disburse(uint256 _amount) internal {
		if (_amount > 0) {
			if (totalDeposited() == 0) {
				info.pendingRewards += _amount;
			} else {
				info.scaledRewardsPerToken += (_amount + info.pendingRewards) * FLOAT_SCALAR / totalDeposited();
				info.pendingRewards = 0;
			}
			emit Reward(_amount);
		}
	}
}