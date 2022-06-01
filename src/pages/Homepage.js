import React, { useEffect, useState } from 'react'
import {Button, Input, List, PageHeader, notification, Form} from "antd";
import { utils, transactions, accountCreator, Contract } from "near-api-js";
import {login, parseTokenWithDecimals, buildMerkleTree} from "../utils";
import { functionCall } from 'near-api-js/lib/transaction';
import getConfig from '../config'

const nearConfig = getConfig(process.env.NODE_ENV || 'development')

function Homepage() {

    const [leave, setLeave] = useState([]);
    const [ft_balance, setFtBalane] = useState(0.0);
    const [userAddresses, setUserAddresses] = useState("");
    const [tokenAddress, setTokenAddress] = useState("");

    const onFinish = async () => {
        let tree = buildMerkleTree(leave);
        let root = tree.getRoot().toString('hex');
        console.log(root);
        let ft_contract = new Contract(window.walletConnection.account(), tokenAddress, {
            viewMethods: ['ft_balance_of', 'ft_metadata'],
        });
        try {
            let metadata = await ft_contract.ft_metadata();
            let ft_name = metadata.name;
            console.log("FT name: ", ft_name);
            let airdropOwnerFtBalance = await ft_contract.ft_balance_of({ account_id: window.accountId });
            console.log("User balance: ", airdropOwnerFtBalance);
            if (airdropOwnerFtBalance < ft_balance) {
                notification["warning"]({
                    message: `Số dư ${ft_name} không đủ`,
                    description:
                    'Tài khoản của bạn không đủ số dư tạo airdrop!',
                });
                return;
            }
            let amount = ft_balance.toString();
            console.log("Amount: ", amount);
            const message = {}
            message["merkle_root"] = root;
            message["ft_account_id"] = tokenAddress;

            // create airdrop
            const result = await account.signAndSendTransaction({
                receiverId: tokenAddress,
                actions: [
                    transactions.functionCall(
                        'storage_deposit', 
                        {account_id: nearConfig.contractName},
                        10000000000000, 
                        utils.format.parseNearAmount("0.01")
                     ),
                    transactions.functionCall(
                        'ft_transfer_call', 
                        { receiver_id: nearConfig.contractName, amount: amount, msg: JSON.stringify(message) },
                        250000000000000,
                        "1"
                     )
                ]
            });
        } catch (e) {
            console.log(e);
        }

    };

    const onFinishFailed = (errorInfo) => {
        console.log('Failed:', errorInfo);
    };

    const handleTokenAddressChange = (e) => {
        setTokenAddress(e.target.value);
    }

    const handleLeaveChange = (e) => {
        let addresses = e.target.value;
        setUserAddresses(addresses);
        let userAddresses = addresses.split('\n');
        let l = [];
        let balance = 0.0;
        let regex = /\s+/;
        for (let address of userAddresses) {
            let line = address.trim();
            if (line != '') {
                l.push(line);
                let arr = line.split(regex);
                console.log("arr: ", arr);
                balance += parseFloat(arr[1])
            }
        }
        setLeave(l);
        setFtBalane(balance);
    }

    console.log("token address: ", tokenAddress);
    console.log("leave: ", leave);
    console.log("balance: ", ft_balance);

    return (
        <div style={{ display: 'flex', justifyContent: 'center'}}>
            <Form
                style={{width: '50%'}}
                name="basic"
                labelCol={{
                    span: 8,
                }}
                wrapperCol={{
                    span: 16,
                }}
                initialValues={{
                    
                }}
                onFinish={onFinish}
                onFinishFailed={onFinishFailed}
                autoComplete="off"
            >
                <Form.Item
                    label="Token Address"
                    name="token"
                    rules={[
                        {
                            required: true,
                            message: 'Please enter the token address (e.g. ft.example.testnet)',
                        },
                    ]}
                >
                    <Input value={tokenAddress} onChange={handleTokenAddressChange} />
                </Form.Item>

                <Form.Item
                    label="List of Addresses in CSV"
                    name="address"
                    rules={[
                        {
                            required: true,
                            message: 'Please enter the list of user addresses in format "account.testnet 10"',
                        },
                    ]}
                >
                    <Input.TextArea rows={20} value={userAddresses} onChange={handleLeaveChange} />
                </Form.Item>

                <Form.Item
                    wrapperCol={{
                        offset: 8,
                        span: 16,
                    }}
                >
                    <Button type="primary" htmlType="submit">
                        Airdrop
                    </Button>
                </Form.Item>
            </Form>
        </div>
    )
}

export default Homepage;