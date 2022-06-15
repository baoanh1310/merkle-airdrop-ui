import React, { useEffect, useState } from 'react'
import {Button, Input, Upload, notification, Form} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { utils, transactions, accountCreator, Contract } from "near-api-js";
import {login, parseTokenWithDecimals, buildMerkleTree} from "../utils";
import { functionCall } from 'near-api-js/lib/transaction';
import getConfig from '../config';
import axios from 'axios';
import { SERVER_URL } from '../constants';

const nearConfig = getConfig(process.env.NODE_ENV || 'development')

function Homepage() {

    const [leave, setLeave] = useState([]);
    const [ft_balance, setFtBalane] = useState(0.0);
    const [userAddresses, setUserAddresses] = useState("");
    const [tokenAddress, setTokenAddress] = useState("");
    const [csvFile, setCSVFile] = useState("");

    const [numberCampaign, setNumberCampaign] = useState(0)

    useEffect(async () => {
        try {
            let numCampaign = await window.contract.total_number_airdrop_campaigns()
            setNumberCampaign(numCampaign + 1)
        } catch (e) {
            console.log(e);
        }
    }, [])

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
            let ft_symbol = metadata.symbol;
            let ft_icon = metadata.icon;
            let airdropOwnerFtBalance = await ft_contract.ft_balance_of({ account_id: window.accountId });
            console.log("User balance: ", airdropOwnerFtBalance);
            if (airdropOwnerFtBalance < ft_balance) {
                notification["warning"]({
                    message: `Số dư ${ft_name} không đủ`,
                    description:
                    'Tài khoản của bạn không đủ số dư để tạo airdrop!',
                });
                return;
            }
            
            // save csv content in mongodb
            const obj =  { owner: window.accountId, merkle_root: root, tokenAddress: tokenAddress, leave: leave, ft_name: ft_name, ft_symbol: ft_symbol, ft_icon: ft_icon }
            await axios.post(`${SERVER_URL}/api/campaigns/`, obj, {
                'Access-Control-Allow-Origin' : '*',
                'Access-Control-Allow-Methods':'GET,PUT,POST,DELETE,PATCH,OPTIONS',
                });

            // create airdrop
            let amount = ft_balance.toString();
            console.log("Amount: ", amount);
            const message = {}
            message["merkle_root"] = root;
            message["ft_account_id"] = tokenAddress;

            let result = await window.account.signAndSendTransaction({
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
        let l = [numberCampaign];
        let balance = 0.0;
        let regex = /\s+/;
        for (let address of userAddresses) {
            let line = address.trim();
            if (line != '') {
                l.push(line);
                let arr = line.split(regex);
                balance += parseInt(arr[1])
            }
        }
        setLeave(l);
        setFtBalane(balance);
    }

    const handleCSVFileChange = async (e) => {
        e.preventDefault()
        const reader = new FileReader()
        reader.onload = async (e) => { 
            const text = (e.target.result)
            let arr = text.split('\n')
            let lines = []
            for (let line of arr) {
                let subarr = line.split(',')
                let newLine = subarr.join(' ')
                lines.push(newLine)
            }
            let addresses = lines.join('\n')
            let preview = document.getElementById('userAddresses');
            preview.innerHTML = addresses
            let l = [];
            let balance = 0.0;
            let regex = /\s+/;
            for (let address of lines) {
                let line = address.trim();
                if (line != '') {
                    l.push(line);
                    let arr = line.split(regex);
                    balance += parseInt(arr[1])
                }
            }
            setUserAddresses(addresses)
            setLeave(l);
            setFtBalane(balance);
        };
        reader.readAsText(e.target.files[0])
    }

    console.log("token address: ", tokenAddress);
    console.log("leave: ", leave);
    console.log("user addresses: ", userAddresses);
    console.log("balance: ", ft_balance);
    console.log("Server URL: ", SERVER_URL)

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
                    <textarea id="userAddresses" rows={20} cols={50} value={userAddresses} onChange={handleLeaveChange} />
                </Form.Item>

                <Form.Item
                    name="upload"
                    label="Upload CSV"
                >
                    <input type="file" onChange={handleCSVFileChange} />
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