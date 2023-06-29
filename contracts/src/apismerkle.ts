import { keccak256 } from 'js-sha3';
import MerkleTree from 'merkletreejs';

// Function to hash data using Keccak-256
const hashData = (data: string): string => {
  return keccak256(data);
}

// Function to create a Merkle tree from an array of data
const createMerkleTree = (data: string[]): MerkleTree => {
  const hashedData = data.map((dataItem) => Buffer.from(hashData(dataItem), 'hex'));
  const tree = new MerkleTree(hashedData, keccak256, { sort: true });
  console.log("Merkle Tree created");
  return tree;
}

// Function to get and print the Merkle Root
const getMerkleRoot = (tree: MerkleTree): void => {
  const root = tree.getRoot().toString('hex');
  console.log(`Merkle Root: ${root}`);
}

// Function to get and print the Merkle proof for a data item
const getMerkleProof = (tree: MerkleTree, data: string): void => {
  const proof = tree.getProof(Buffer.from(hashData(data), 'hex')).map((x) => x.data.toString('hex'));
  console.log(`Proof for "${data}":`, proof);
  if(!proof || proof.length === 0){
    console.log('true')
} else{
    console.log("false")
}
}

// Usage
const data = ['Data 1', 'Data 2', 'Data 3', 'Data 4'];
const tree = createMerkleTree(data);
getMerkleRoot(tree);
getMerkleProof(tree, "hola");
